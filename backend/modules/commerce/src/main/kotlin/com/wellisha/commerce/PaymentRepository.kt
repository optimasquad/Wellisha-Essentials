package com.wellisha.commerce

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

data class PaymentSetup(val orderId: String,val amountMinor: Long,val receipt: String)
data class PaymentCheckout(val orderId: String,val providerOrderId: String,val keyId: String,val amountMinor: Long,val currency: String)

@Repository
class PaymentRepository(private val jdbc: JdbcClient,private val mapper: ObjectMapper,private val notifications: NotificationRepository) {
    @Transactional
    fun begin(order: String): PaymentSetup? {
        val locked=jdbc.sql("SELECT payment_state,total_minor FROM commerce.orders WHERE id=:id FOR UPDATE").param("id",order)
            .query { rs,_ -> rs.getString("payment_state") to rs.getLong("total_minor") }.optional().orElseThrow { MissingResource() }
        if(locked.first!="PAYMENT_SETUP_PENDING") return null
        val active=jdbc.sql("SELECT count(*) FROM commerce.stock_reservation WHERE order_id=:id AND state='ACTIVE' AND expires_at>clock_timestamp()")
            .param("id",order).query(Long::class.java).single()
        if(active==0L) return null
        require(locked.second>=100)
        val receipt=order // UUID is within the provider's 40-character receipt limit.
        jdbc.sql("INSERT INTO commerce.payment_attempt(order_id,receipt,state) VALUES(:id,:receipt,'CALLING')").param("id",order).param("receipt",receipt).update()
        jdbc.sql("UPDATE commerce.orders SET payment_state='PAYMENT_SETUP_CALLING',version=version+1 WHERE id=:id").param("id",order).update()
        return PaymentSetup(order,locked.second,receipt)
    }
    @Transactional
    fun ready(order: String,providerOrder: String,keyId: String) {
        jdbc.sql("SELECT id FROM commerce.orders WHERE id=:id FOR UPDATE").param("id",order).query(String::class.java).single()
        check(providerOrder.matches(Regex("order_[A-Za-z0-9]+")) && keyId.matches(Regex("rzp_(test|live)_[A-Za-z0-9]+")))
        if(jdbc.sql("UPDATE commerce.payment_attempt SET state='READY',provider_order_id=:provider,key_id=:key,updated_at=clock_timestamp() WHERE order_id=:id AND state IN ('CALLING','UNKNOWN')")
            .param("provider",providerOrder).param("key",keyId).param("id",order).update()!=1) throw StateConflict()
        jdbc.sql("UPDATE commerce.orders SET payment_state='PAYMENT_READY',version=version+1 WHERE id=:id AND payment_state IN ('PAYMENT_SETUP_CALLING','PAYMENT_SETUP_UNKNOWN')").param("id",order).update()
    }
    @Transactional
    fun unknown(order: String) {
        jdbc.sql("SELECT id FROM commerce.orders WHERE id=:id FOR UPDATE").param("id",order).query(String::class.java).single()
        jdbc.sql("UPDATE commerce.payment_attempt SET state='UNKNOWN',updated_at=clock_timestamp() WHERE order_id=:id AND state='CALLING'").param("id",order).update()
        jdbc.sql("UPDATE commerce.orders SET payment_state='PAYMENT_SETUP_UNKNOWN',version=version+1 WHERE id=:id AND payment_state='PAYMENT_SETUP_CALLING'").param("id",order).update()
    }
    fun checkout(customer: String,order: String): PaymentCheckout = jdbc.sql("""SELECT o.id,o.total_minor,o.currency,a.provider_order_id,a.key_id FROM commerce.orders o
        JOIN commerce.payment_attempt a ON a.order_id=o.id JOIN commerce.stock_reservation r ON r.order_id=o.id
        WHERE o.id=:id AND o.customer_id=:customer AND o.payment_state='PAYMENT_READY' AND a.state='READY'
        AND r.state='ACTIVE' AND r.expires_at>clock_timestamp()""")
        .param("id",order).param("customer",customer).query { rs,_ -> PaymentCheckout(rs.getString("id"),rs.getString("provider_order_id"),rs.getString("key_id"),rs.getLong("total_minor"),rs.getString("currency")) }
        .optional().orElseThrow { MissingResource() }

    @Transactional
    fun capture(providerOrder: String,payment: String,amount: Long,currency: String): Boolean {
        require(payment.matches(Regex("pay_[A-Za-z0-9]+")))
        val order=jdbc.sql("SELECT o.id,o.customer_id,o.total_minor,o.payment_state FROM commerce.orders o JOIN commerce.payment_attempt a ON a.order_id=o.id WHERE a.provider_order_id=:provider FOR UPDATE OF o")
            .param("provider",providerOrder).query { rs,_ -> arrayOf(rs.getString("id"),rs.getString("customer_id"),rs.getLong("total_minor").toString(),rs.getString("payment_state")) }
            .optional().orElseThrow { MissingResource() }
        if(currency!="INR" || amount!=order[2].toLong() || amount<=0) throw StateConflict()
        val prior=jdbc.sql("SELECT payment_id FROM commerce.captured_payment WHERE order_id=:id").param("id",order[0]).query(String::class.java).optional()
        if(prior.isPresent) { if(prior.get()!=payment) throw StateConflict(); return false }
        jdbc.sql("INSERT INTO commerce.captured_payment(payment_id,order_id,amount_minor,currency) VALUES(:payment,:order,:amount,:currency)")
            .param("payment",payment).param("order",order[0]).param("amount",amount).param("currency",currency).update()
        val reserved=jdbc.sql("SELECT state,expires_at>clock_timestamp() AS valid FROM commerce.stock_reservation WHERE order_id=:id FOR UPDATE")
            .param("id",order[0]).query { rs,_ -> rs.getString("state") to rs.getBoolean("valid") }.single()
        val reservation=reserved.first=="ACTIVE" && reserved.second
        if(!reservation && reserved.first=="ACTIVE") {
            val lines=jdbc.sql("SELECT product_id,quantity FROM commerce.order_line WHERE order_id=:id ORDER BY product_id").param("id",order[0])
                .query { rs,_ -> rs.getString("product_id") to rs.getInt("quantity") }.list()
            lines.forEach { (id,quantity) -> jdbc.sql("UPDATE commerce.product SET stock=stock+:quantity WHERE id=:id").param("id",id).param("quantity",quantity).update() }
            jdbc.sql("UPDATE commerce.stock_reservation SET state='EXPIRED',updated_at=clock_timestamp() WHERE order_id=:id").param("id",order[0]).update()
        }
        // Late money never recreates released stock or triggers a shipment.
        val state=if(reservation) "CAPTURED" else "PAID_LATE_REVIEW"
        jdbc.sql("UPDATE commerce.orders SET payment_state=:state,fulfillment_state=:fulfillment,version=version+1 WHERE id=:id")
            .param("state",state).param("fulfillment",if(reservation)"AWAITING_PACKING" else "MANUAL_REVIEW").param("id",order[0]).update()
        if(reservation) {
            jdbc.sql("UPDATE commerce.stock_reservation SET state='CONSUMED',updated_at=clock_timestamp() WHERE order_id=:id").param("id",order[0]).update()
            jdbc.sql("INSERT INTO commerce.packing_task(order_id) VALUES(:id)").param("id",order[0]).update()
        }
        jdbc.sql("INSERT INTO commerce.notification(id,customer_id,order_id,event_id,message) VALUES(:id,:customer,:order,:event,:message)")
            .param("id",UUID.randomUUID().toString()).param("customer",order[1]).param("order",order[0]).param("event","capture:$payment")
            .param("message",if(reservation)"Payment confirmed. Your order is being prepared." else "Payment received after the checkout window. Our team will review your order.").update()
        notifications.enqueue(order[1],order[0],"capture:$payment",if(reservation)"Payment confirmed. Your order is being prepared." else "Payment received after the checkout window. Our team will review your order.")
        return true
    }
    @Transactional
    fun ingest(event: String,body: ByteArray) {
        require(event.matches(Regex("[A-Za-z0-9_-]{1,100}")))
        val tree=mapper.readTree(body)
        require(tree.isObject && tree.path("event").isTextual)
        val hash=java.security.MessageDigest.getInstance("SHA-256").digest(body).joinToString("") { "%02x".format(it) }
        jdbc.sql("INSERT INTO commerce.inbox(provider,event_id,payload,payload_hash) VALUES('razorpay',:event,CAST(:body AS jsonb),:hash) ON CONFLICT DO NOTHING")
            .param("event",event).param("body",mapper.writeValueAsString(tree)).param("hash",hash).update()
        val saved=jdbc.sql("SELECT payload_hash FROM commerce.inbox WHERE provider='razorpay' AND event_id=:event").param("event",event).query(String::class.java).single()
        if(saved!=hash) throw StateConflict()
    }
}
