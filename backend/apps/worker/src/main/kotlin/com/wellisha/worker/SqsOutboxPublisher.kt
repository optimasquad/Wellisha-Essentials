package com.wellisha.worker

import org.springframework.stereotype.Component
import org.springframework.core.env.Environment
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.scheduling.annotation.Scheduled
import software.amazon.awssdk.services.sqs.SqsClient
import software.amazon.awssdk.services.sqs.model.SendMessageRequest
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import java.util.UUID

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name=["WORKER_MODE"],havingValue="outbox-relay")
class SqsOutboxPublisher(private val jdbc: JdbcClient,private val env: Environment,private val mapper: ObjectMapper) {
    private val log=LoggerFactory.getLogger(javaClass)
    private val sqs=SqsClient.create()
    private data class Event(val id:String,val aggregate:String,val type:String,val payload:String)
    @Scheduled(fixedDelay=1000)
    fun dispatch() {
        val lease=UUID.randomUUID().toString()
        try {
            val events=jdbc.sql("""WITH pending AS (
                SELECT id FROM commerce.outbox WHERE dispatched_at IS NULL
                AND (lease_until IS NULL OR lease_until<now()) ORDER BY created_at
                FOR UPDATE SKIP LOCKED LIMIT 20
                ) UPDATE commerce.outbox o SET lease_until=now()+interval '2 minutes',
                lease_token=:lease,attempts=attempts+1 FROM pending WHERE o.id=pending.id
                RETURNING o.id,o.aggregate_id,o.event_type,o.payload::text""")
                .param("lease",lease).query { rs,_ ->
                    Event(rs.getString("id"),rs.getString("aggregate_id"),rs.getString("event_type"),rs.getString("payload"))
                }.list()
            events.forEach { event ->
                try {
                    val queue=when(event.type) {
                        "PaymentSetupRequested" -> env.getRequiredProperty("QUEUE_URL_PAYMENT")
                        "PackagePackedReady" -> env.getRequiredProperty("QUEUE_URL_SHIPPING")
                        "ShipmentCancellationRequested" -> env.getRequiredProperty("QUEUE_URL_SHIPPING")
                        "RefundRequested" -> env.getRequiredProperty("QUEUE_URL_REFUND")
                        "EmailRequested" -> env.getRequiredProperty("QUEUE_URL_EMAIL")
                        "SmsRequested" -> env.getRequiredProperty("QUEUE_URL_SMS")
                        else -> throw IllegalStateException("No queue route for event type")
                    }
                    val message=mapper.writeValueAsString(mapOf("eventId" to event.id,"aggregateId" to event.aggregate,
                        "eventType" to event.type,"payload" to mapper.readTree(event.payload)))
                    sqs.sendMessage(SendMessageRequest.builder().queueUrl(queue).messageBody(message).build())
                    jdbc.sql("UPDATE commerce.outbox SET dispatched_at=now(),lease_until=NULL,lease_token=NULL WHERE id=:id AND lease_token=:lease")
                        .param("id",event.id).param("lease",lease).update()
                    log.info("outbox_dispatched eventId={} eventType={}",event.id,event.type)
                } catch(e:Exception) {
                    log.error("outbox_dispatch_failed eventId={} exceptionType={}",event.id,e.javaClass.simpleName)
                }
            }
        } catch(e:Exception) {
            log.error("outbox_poll_failed exceptionType={}",e.javaClass.simpleName)
        }
    }
}
