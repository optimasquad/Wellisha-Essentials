package com.wellisha.worker

import com.wellisha.commerce.*
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression
import org.springframework.core.env.Environment
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import software.amazon.awssdk.services.sesv2.SesV2Client
import software.amazon.awssdk.services.sesv2.model.*
import software.amazon.awssdk.services.sns.SnsClient
import software.amazon.awssdk.services.sns.model.PublishRequest
import software.amazon.awssdk.services.sns.model.MessageAttributeValue
import com.fasterxml.jackson.databind.ObjectMapper

@Component
@ConditionalOnExpression("'\${WORKER_MODE:}' == 'email' || '\${WORKER_MODE:}' == 'sms'")
class NotificationWorker(private val notifications: NotificationRepository,private val env: Environment,private val jdbc: JdbcClient,private val mapper: ObjectMapper) {
    fun send(id: String) {
        val mode=env.getRequiredProperty("WORKER_MODE")
        val from=if(mode=="email")env.getRequiredProperty("EMAIL_FROM") else env.getRequiredProperty("SMS_SENDER_ID")
        val entity=if(mode=="sms")env.getRequiredProperty("SMS_ENTITY_ID") else ""
        val templates=if(mode=="sms")mapper.readTree(env.getRequiredProperty("SMS_TEMPLATES_JSON")).fields().asSequence().associate { it.key to it.value.asText() } else emptyMap()
        if(mode=="sms")check(templates.isNotEmpty() && templates.values.all { it.isNotBlank() })
        if(mode=="sms")notifications.pendingMessage(id)?.let { check(templates.containsKey(it)) { "Approved SMS template missing" } }
        val work=notifications.begin(id,mode.uppercase(),if(mode=="sms")templates.keys.toList() else null) ?: return
        try {
            val provider=if(mode=="email") SesV2Client.builder().overrideConfiguration { it.retryPolicy(software.amazon.awssdk.core.retry.RetryPolicy.none()) }.build().use { client ->
                client.sendEmail(SendEmailRequest.builder().fromEmailAddress(from).destination(Destination.builder().toAddresses(work.destination).build())
                    .content(EmailContent.builder().simple(Message.builder().subject(Content.builder().data("Wellisha order update").charset("UTF-8").build())
                        .body(Body.builder().text(Content.builder().data(work.message).charset("UTF-8").build()).build()).build()).build()).build()).messageId()
            } else {
                // India DLT templates must be approved for the exact transactional text.
                val attrs=mapOf("AWS.SNS.SMS.SMSType" to "Transactional","AWS.SNS.SMS.SenderID" to from,
                    "AWS.MM.SMS.EntityId" to entity,"AWS.MM.SMS.TemplateId" to templates.getValue(work.message))
                SnsClient.builder().overrideConfiguration { it.retryPolicy(software.amazon.awssdk.core.retry.RetryPolicy.none()) }.build().use { client -> client.publish(PublishRequest.builder().phoneNumber(work.destination).message(work.message)
                    .messageAttributes(attrs.mapValues { MessageAttributeValue.builder().dataType("String").stringValue(it.value).build() }).build()).messageId() }
            }
            notifications.sent(id,provider)
        } catch(e: Exception) { notifications.unknown(id);throw e }
    }
    @Scheduled(fixedDelay=60000) fun recover() {
        jdbc.sql("UPDATE commerce.notification_delivery SET state='UNKNOWN',updated_at=clock_timestamp() WHERE channel=:channel AND state='CALLING' AND updated_at<clock_timestamp()-interval '2 minutes'")
            .param("channel",env.getRequiredProperty("WORKER_MODE").uppercase()).update()
    }
}
