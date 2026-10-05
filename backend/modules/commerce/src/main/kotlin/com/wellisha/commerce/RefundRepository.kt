package com.wellisha.commerce

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import com.fasterxml.jackson.databind.ObjectMapper
import java.util.UUID

data class RefundInput(@field:jakarta.validation.constraints.Min(1) val amountMinor: Long,@field:jakarta.validation.constraints.NotBlank @field:jakarta.validation.constraints.Size(max=240) val reason: String)
data class RefundView(val id: String,val orderId: String,val amountMinor: Long,val state: String)
data class RefundWork(val id: String,val paymentId: String,val amountMinor: Long)

@Repository
class RefundRepository(private val jdbc: JdbcClient,private val mapper: ObjectMapper,private val notifications: NotificationRepository) {
    @Transactional fun request(actor: String,order: String,key: String,input: RefundInput): RefundView {
        require(key.matches(Regex("[A-Za-z0-9_-]{16,100}")) && input.amountMinor>0)
        jdbc.sql("SELECT id FROM commerce.orders WHERE id=:id FOR UPDATE").param("id",order).query(String::class.java).optional().orElseThrow { MissingResource() }
        val prior=jdbc.sql("SELECT id,amount_minor,state,reason FROM commerce.refund_request WHERE order_id=:order AND idempotency_key=:key")
            .param("order",order).param("key",key).query { rs,_ -> RefundView(rs.getString("id"),order,rs.getLong("amount_minor"),rs.getString("state")) to rs.getString("reason") }.optional()
        if(prior.isPresent) { if(prior.get().first.amountMinor!=input.amountMinor || prior.get().second!=input.reason) throw StateConflict();return prior.get().first }
        val captured=jdbc.sql("SELECT amount_minor FROM commerce.captured_payment WHERE order_id=:order").param("order",order).query(Long::class.java).optional().orElseThrow { StateConflict() }
        val held=jdbc.sql("SELECT COALESCE(sum(amount_minor),0) FROM commerce.refund_request WHERE order_id=:order AND state!='FAILED'").param("order",order).query(Long::class.java).single()
        if(input.amountMinor>captured-held) throw StateConflict()
        val id=UUID.randomUUID().toString()
        jdbc.sql("INSERT INTO commerce.refund_request(id,order_id,amount_minor,reason,actor_id,idempotency_key,state) VALUES(:id,:order,:amount,:reason,:actor,:key,'PENDING')")
            .param("id",id).param("order",order).param("amount",input.amountMinor).param("reason",input.reason).param("actor",actor).param("key",key).update()
        jdbc.sql("INSERT INTO commerce.outbox(id,aggregate_id,event_type,payload) VALUES(:event,:id,'RefundRequested',CAST(:payload AS jsonb))")
            .param("event",UUID.randomUUID().toString()).param("id",id).param("payload",mapper.writeValueAsString(mapOf("refundId" to id))).update()
        return RefundView(id,order,input.amountMinor,"PENDING")
    }
    @Transactional fun begin(id: String): RefundWork? = jdbc.sql("""UPDATE commerce.refund_request r SET state='CALLING',updated_at=clock_timestamp()
        FROM commerce.captured_payment p WHERE r.id=:id AND r.state='PENDING' AND p.order_id=r.order_id
        RETURNING r.id,p.payment_id,r.amount_minor""").param("id",id)
        .query { rs,_ -> RefundWork(rs.getString("id"),rs.getString("payment_id"),rs.getLong("amount_minor")) }.optional().orElse(null)
    fun unknown(id: String) { jdbc.sql("UPDATE commerce.refund_request SET state='UNKNOWN',updated_at=clock_timestamp() WHERE id=:id AND state='CALLING'").param("id",id).update() }
    @Transactional fun resolved(id: String,providerId: String,status: String) {
        require(providerId.matches(Regex("rfnd_[A-Za-z0-9]+")) && status in setOf("processed","failed","pending"))
        val state=when(status) { "processed" -> "PROCESSED";"failed" -> "FAILED";else -> "UNKNOWN" }
        val row=jdbc.sql("SELECT order_id,state,provider_refund_id FROM commerce.refund_request WHERE id=:id FOR UPDATE").param("id",id)
            .query { rs,_ -> Triple(rs.getString("order_id"),rs.getString("state"),rs.getString("provider_refund_id")) }.optional().orElseThrow { MissingResource() }
        if(row.third!=null && row.third!=providerId) throw StateConflict()
        if(row.second in setOf("PROCESSED","FAILED")) return
        jdbc.sql("UPDATE commerce.refund_request SET state=:state,provider_refund_id=:provider,updated_at=clock_timestamp() WHERE id=:id")
            .param("state",state).param("provider",providerId).param("id",id).update()
        if(state=="PROCESSED") {
            val customer=jdbc.sql("SELECT customer_id FROM commerce.orders WHERE id=:id").param("id",row.first).query(String::class.java).single()
            val event=UUID.randomUUID().toString();val message="Your refund has been processed."
            jdbc.sql("INSERT INTO commerce.notification(id,customer_id,order_id,event_id,message) VALUES(:id,:customer,:order,:event,:message)")
                .param("id",event).param("event","refund:"+id).param("customer",customer).param("order",row.first).param("message",message).update()
            notifications.enqueue(customer,row.first,event,message)
        }
        // Refund processing is independent of physical shipment cancellation and inventory return.
    }
}
