package com.wellisha.commerce

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
class ReservationRepository(private val jdbc: JdbcClient) {
    @Transactional
    fun expireBatch(): Int {
        // Order row lock serializes expiry with verified capture. A provider call in progress
        // retains its reservation until reconciliation determines the outcome.
        val due=jdbc.sql("""SELECT o.id FROM commerce.orders o JOIN commerce.stock_reservation r ON r.order_id=o.id
            WHERE r.state='ACTIVE' AND r.expires_at<=clock_timestamp()
            AND o.payment_state IN ('PAYMENT_SETUP_PENDING','PAYMENT_READY','PAYMENT_FAILED')
            ORDER BY r.expires_at,o.id LIMIT 50 FOR UPDATE OF o SKIP LOCKED""").query(String::class.java).list()
        val allLines=due.associateWith { id -> jdbc.sql("SELECT product_id,quantity FROM commerce.order_line WHERE order_id=:id ORDER BY product_id")
                .param("id",id).query { rs,_ -> rs.getString("product_id") to rs.getInt("quantity") }.list()
        }
        allLines.values.flatten().map { it.first }.distinct().sorted().forEach { product ->
            jdbc.sql("SELECT id FROM commerce.product WHERE id=:id FOR UPDATE").param("id",product).query(String::class.java).single()
        }
        due.forEach { id ->
            val lines=allLines.getValue(id)
            lines.forEach { (product,quantity) -> jdbc.sql("UPDATE commerce.product SET stock=stock+:quantity WHERE id=:id")
                .param("quantity",quantity).param("id",product).update() }
            jdbc.sql("UPDATE commerce.stock_reservation SET state='EXPIRED',updated_at=clock_timestamp() WHERE order_id=:id AND state='ACTIVE'").param("id",id).update()
            jdbc.sql("UPDATE commerce.orders SET payment_state='PAYMENT_EXPIRED',fulfillment_state='CANCELLED',version=version+1 WHERE id=:id").param("id",id).update()
        }
        return due.size
    }
}
