package com.wellisha.commerce

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

data class NotificationPreferences(val emailEnabled: Boolean,val smsEnabled: Boolean,val version: Long)
data class NotificationPreferenceInput(val emailEnabled: Boolean,val smsEnabled: Boolean,@field:jakarta.validation.constraints.Min(0) val version: Long)
data class NotificationWork(val id: String,val destination: String,val message: String,val channel: String)

@Repository
class NotificationRepository(private val jdbc: JdbcClient,private val mapper: ObjectMapper) {
    @Transactional fun preferences(customer: String,email: String?,phone: String?): NotificationPreferences {
        jdbc.sql("INSERT INTO commerce.notification_contact(customer_id,email,phone) VALUES(:id,:email,:phone) ON CONFLICT(customer_id) DO UPDATE SET email=:email,phone=:phone")
            .param("id",customer).param("email",email).param("phone",phone).update()
        return jdbc.sql("SELECT email_enabled,sms_enabled,version FROM commerce.notification_contact WHERE customer_id=:id").param("id",customer)
            .query { rs,_ -> NotificationPreferences(rs.getBoolean(1),rs.getBoolean(2),rs.getLong(3)) }.single()
    }
    @Transactional fun update(customer: String,email: String?,phone: String?,input: NotificationPreferenceInput): NotificationPreferences {
        preferences(customer,email,phone)
        require(!input.emailEnabled || !email.isNullOrBlank());require(!input.smsEnabled || !phone.isNullOrBlank())
        if(jdbc.sql("UPDATE commerce.notification_contact SET email_enabled=:email,sms_enabled=:sms,version=version+1 WHERE customer_id=:id AND version=:version")
            .param("email",input.emailEnabled).param("sms",input.smsEnabled).param("id",customer).param("version",input.version).update()!=1) throw StateConflict()
        return preferences(customer,email,phone)
    }
    @Transactional fun enqueue(customer: String,order: String,event: String,message: String) {
        data class Contact(val email: String?,val phone: String?,val emailOn: Boolean,val smsOn: Boolean)
        val contact=jdbc.sql("SELECT email,phone,email_enabled,sms_enabled FROM commerce.notification_contact WHERE customer_id=:id").param("id",customer)
            .query { rs,_ -> Contact(rs.getString(1),rs.getString(2),rs.getBoolean(3),rs.getBoolean(4)) }.optional().orElse(null) ?: return
        listOf(Triple("EMAIL",contact.email,contact.emailOn),Triple("SMS",contact.phone,contact.smsOn)).forEach { (channel,destination,enabled) ->
            if(enabled && !destination.isNullOrBlank()) {
                val id=UUID.randomUUID().toString()
                val added=jdbc.sql("INSERT INTO commerce.notification_delivery(id,customer_id,order_id,event_id,channel,destination,message) VALUES(:id,:customer,:order,:event,:channel,:destination,:message) ON CONFLICT DO NOTHING")
                    .param("id",id).param("customer",customer).param("order",order).param("event",event).param("channel",channel).param("destination",destination).param("message",message).update()
                if(added==1) jdbc.sql("INSERT INTO commerce.outbox(id,aggregate_id,event_type,payload) VALUES(:event,:id,:type,CAST(:payload AS jsonb))")
                    .param("event",UUID.randomUUID().toString()).param("id",id).param("type",if(channel=="EMAIL")"EmailRequested" else "SmsRequested")
                    .param("payload",mapper.writeValueAsString(mapOf("notificationId" to id))).update()
            }
        }
    }
    @Transactional fun begin(id: String,channel: String,approvedMessages: List<String>?=null): NotificationWork? {
        // Opt-out after enqueue prevents unsent jobs from being delivered.
        return jdbc.sql("""UPDATE commerce.notification_delivery d SET state='CALLING',updated_at=clock_timestamp() FROM commerce.notification_contact c
            WHERE d.id=:id AND d.state='PENDING' AND d.channel=:channel AND c.customer_id=d.customer_id
            AND (:all OR d.message IN (:messages))
            AND ((d.channel='EMAIL' AND c.email_enabled AND c.email=d.destination) OR (d.channel='SMS' AND c.sms_enabled AND c.phone=d.destination))
            RETURNING d.id,d.destination,d.message,d.channel""").param("id",id).param("channel",channel).param("all",approvedMessages==null).param("messages",approvedMessages ?: listOf(""))
            .query { rs,_ -> NotificationWork(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4)) }.optional().orElse(null)
    }
    fun pendingMessage(id: String): String? = jdbc.sql("SELECT message FROM commerce.notification_delivery WHERE id=:id AND state='PENDING'")
        .param("id",id).query(String::class.java).optional().orElse(null)
    fun sent(id: String,provider: String) { jdbc.sql("UPDATE commerce.notification_delivery SET state='SENT',provider_message_id=:provider,updated_at=clock_timestamp() WHERE id=:id AND state='CALLING'").param("id",id).param("provider",provider).update() }
    fun unknown(id: String) { jdbc.sql("UPDATE commerce.notification_delivery SET state='UNKNOWN',updated_at=clock_timestamp() WHERE id=:id AND state='CALLING'").param("id",id).update() }
}
