package com.wellisha.worker

import com.fasterxml.jackson.databind.ObjectMapper
import com.wellisha.commerce.*
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.core.env.Environment
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.slf4j.LoggerFactory
import java.util.UUID

@Component
@ConditionalOnProperty(name=["WORKER_MODE"],havingValue="payment")
class PaymentWorker(private val jdbc: JdbcClient,private val payments: PaymentRepository,private val reservations: ReservationRepository,
    private val secrets: ProviderSecrets,private val mapper: ObjectMapper,private val env: Environment) {
    private val log=LoggerFactory.getLogger(javaClass)
    private fun gateway(): Pair<RazorpayGateway,String> {
        val secret=secrets.read("RAZORPAY")
        val key=secret.path("keyId").asText()
        check(key.isNotBlank() && secret.path("keySecret").asText().isNotBlank())
        return RazorpayGateway(mapper,key,secret.path("keySecret").asText()) to key
    }
    fun setup(order: String) {
        val (provider,key)=gateway() // Missing configuration must not consume the attempt.
        val work=payments.begin(order) ?: return
        try { payments.ready(order,provider.createOrder(work),key) }
        catch(e: Exception) { payments.unknown(order);throw e }
    }
    @Scheduled(fixedDelay=5000)
    fun maintain() {
        try {
            reservations.expireBatch()
            // A process crash after sending a POST has the same unknown outcome as a timeout.
            jdbc.sql("SELECT order_id FROM commerce.payment_attempt WHERE state='CALLING' AND started_at<clock_timestamp()-interval '2 minutes'")
                .query(String::class.java).list().forEach { payments.unknown(it) }
            val (provider,key)=gateway()
            jdbc.sql("SELECT a.order_id,a.receipt,o.total_minor FROM commerce.payment_attempt a JOIN commerce.orders o ON o.id=a.order_id WHERE a.state='UNKNOWN' ORDER BY a.updated_at LIMIT 20")
                .query { rs,_ -> PaymentSetup(rs.getString("order_id"),rs.getLong("total_minor"),rs.getString("receipt")) }.list().forEach { work ->
                    runCatching { provider.findOrder(work)?.let { payments.ready(work.orderId,it,key) } }
                    jdbc.sql("UPDATE commerce.payment_attempt SET updated_at=clock_timestamp() WHERE order_id=:id AND state='UNKNOWN'").param("id",work.orderId).update()
                }
            jdbc.sql("SELECT provider_order_id FROM commerce.payment_attempt a JOIN commerce.orders o ON o.id=a.order_id WHERE a.state='READY' AND o.payment_state IN ('PAYMENT_READY','PAYMENT_EXPIRED') ORDER BY a.updated_at LIMIT 20")
                .query(String::class.java).list().forEach { order ->
                    runCatching { provider.payments(order).filter { it.path("status").asText()=="captured" }.forEach {
                        if(it.path("order_id").asText()!=order) throw StateConflict()
                        payments.capture(order,it.path("id").asText(),it.path("amount").asLong(-1),it.path("currency").asText())
                    } }
                    jdbc.sql("UPDATE commerce.payment_attempt SET updated_at=clock_timestamp() WHERE provider_order_id=:id AND state='READY'").param("id",order).update()
                }
            processInbox()
        } catch(e: Exception) { log.error("payment_maintenance_failed exceptionType={}",e.javaClass.simpleName) }
    }
    private fun processInbox() {
        val lease=UUID.randomUUID().toString()
        val events=jdbc.sql("""WITH due AS (SELECT provider,event_id FROM commerce.inbox WHERE provider='razorpay' AND processed_at IS NULL
            AND processing_state!='MANUAL_REVIEW' AND next_attempt_at<=clock_timestamp() AND (lease_until IS NULL OR lease_until<clock_timestamp())
            ORDER BY received_at LIMIT 20 FOR UPDATE SKIP LOCKED)
            UPDATE commerce.inbox i SET lease_token=:lease,lease_until=clock_timestamp()+interval '2 minutes',attempts=attempts+1
            FROM due WHERE i.provider=due.provider AND i.event_id=due.event_id RETURNING i.event_id,i.payload::text,i.attempts""")
            .param("lease",lease).query { rs,_ -> Triple(rs.getString("event_id"),rs.getString("payload"),rs.getInt("attempts")) }.list()
        events.forEach { (id,body,attempts) ->
            try {
                val payload=mapper.readTree(body)
                val account=secrets.read("RAZORPAY").path("accountId").asText()
                check(account.isNotBlank() && payload.path("account_id").asText()==account)
                if(payload.path("event").asText()=="payment.captured") {
                    val entity=payload.path("payload").path("payment").path("entity")
                    check(entity.path("status").asText()=="captured")
                    payments.capture(entity.path("order_id").asText(),entity.path("id").asText(),entity.path("amount").asLong(-1),entity.path("currency").asText())
                }
                jdbc.sql("UPDATE commerce.inbox SET processed_at=clock_timestamp(),processing_state='PROCESSED',lease_until=NULL WHERE provider='razorpay' AND event_id=:id AND lease_token=:lease")
                    .param("id",id).param("lease",lease).update()
            } catch(e: Exception) {
                jdbc.sql("UPDATE commerce.inbox SET processing_state=:state,next_attempt_at=clock_timestamp()+interval '1 minute',lease_until=NULL WHERE provider='razorpay' AND event_id=:id AND lease_token=:lease")
                    .param("state",if(attempts>=10)"MANUAL_REVIEW" else "PENDING").param("id",id).param("lease",lease).update()
                log.error("payment_event_failed eventId={} exceptionType={}",id,e.javaClass.simpleName)
            }
        }
    }
}
