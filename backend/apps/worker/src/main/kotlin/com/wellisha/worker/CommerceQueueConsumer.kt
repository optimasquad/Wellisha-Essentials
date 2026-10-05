package com.wellisha.worker

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.core.env.Environment
import org.springframework.context.ApplicationContext
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import software.amazon.awssdk.services.sqs.SqsClient
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest
import org.slf4j.LoggerFactory

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnExpression("'\${WORKER_MODE:outbox-relay}' != 'outbox-relay'")
class CommerceQueueConsumer(private val env: Environment,private val mapper: ObjectMapper,private val context: ApplicationContext) {
    private val log=LoggerFactory.getLogger(javaClass)
    private val sqs=SqsClient.create()
    @Scheduled(fixedDelay=1000)
    fun poll() {
        try {
            val mode=env.getRequiredProperty("WORKER_MODE")
            val queue=env.getRequiredProperty("QUEUE_URL_"+mode.uppercase())
            val messages=sqs.receiveMessage(ReceiveMessageRequest.builder().queueUrl(queue).maxNumberOfMessages(1).waitTimeSeconds(10).visibilityTimeout(120).build()).messages()
            messages.forEach { message ->
                try {
                    require(message.body().toByteArray().size<=16384)
                    val event=mapper.readTree(message.body())
                    require(event.path("eventId").asText().matches(Regex("[A-Za-z0-9_-]{1,100}")))
                    val id=event.path("aggregateId").asText()
                    require(id.matches(Regex("[A-Za-z0-9_-]{1,100}")))
                    when(mode) {
                        "payment" -> { require(event.path("eventType").asText()=="PaymentSetupRequested");context.getBean(PaymentWorker::class.java).setup(id) }
                        "refund" -> { require(event.path("eventType").asText()=="RefundRequested");context.getBean(RefundWorker::class.java).process(id) }
                        "shipping" -> when(event.path("eventType").asText()) { "PackagePackedReady" -> context.getBean(ShippingWorker::class.java).book(id);"ShipmentCancellationRequested" -> context.getBean(ShippingWorker::class.java).cancel(id);else -> throw IllegalArgumentException() }
                        "email","sms" -> { require(event.path("eventType").asText()==if(mode=="email")"EmailRequested" else "SmsRequested");context.getBean(NotificationWorker::class.java).send(id) }
                        else -> throw IllegalStateException("Unsupported worker mode")
                    }
                    // The handler's durable state prevents repeated POSTs after crash/redelivery.
                    sqs.deleteMessage(DeleteMessageRequest.builder().queueUrl(queue).receiptHandle(message.receiptHandle()).build())
                } catch(e: Exception) { log.error("consumer_message_failed messageId={} exceptionType={}",message.messageId(),e.javaClass.simpleName) }
            }
        } catch(e: Exception) { log.error("consumer_poll_failed exceptionType={}",e.javaClass.simpleName) }
    }
}
