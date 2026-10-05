package com.wellisha.commerce

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
class OrderAndShipmentRepository(private val jdbc: JdbcClient, private val mapper: ObjectMapper,private val catalog: CatalogPricingRepository,private val env: org.springframework.core.env.Environment) {
    fun shipping(subtotal: Long): Long {
        val fee=env.getProperty("CHECKOUT_SHIPPING_MINOR",Long::class.java,4900L)
        val threshold=env.getProperty("CHECKOUT_FREE_SHIPPING_ABOVE_MINOR",Long::class.java,49900L)
        require(fee in 0..1000000 && threshold>=0)
        return if(subtotal>threshold) 0L else fee
    }

    @Transactional
    fun createOrder(customer: String,key: String,input: CreateOrderInput,acceptedAt: java.time.Instant? = null): OrderView {
        require(key.matches(Regex("[A-Za-z0-9_-]{16,100}")))
        val requestHash = java.security.MessageDigest.getInstance("SHA-256")
            .digest(mapper.writeValueAsBytes(input)).joinToString("") { "%02x".format(it) }
        // Serializes idempotent requests for this customer without string-built SQL.
        jdbc.sql("SELECT id FROM commerce.customer WHERE id=:customer FOR UPDATE").param("customer",customer)
            .query(String::class.java).single()
        val existing = jdbc.sql("SELECT id,request_hash FROM commerce.orders WHERE customer_id=:customer AND idempotency_key=:key")
            .param("customer",customer).param("key",key).query { rs,_ -> rs.getString("id") to rs.getString("request_hash") }.optional()
        if(existing.isPresent) {
            if(existing.get().second!=requestHash) throw StateConflict()
            return order(customer,existing.get().first)
        }
        val address = jdbc.sql("SELECT name,phone,address_line,city,state,pincode FROM commerce.address WHERE id=:id AND customer_id=:customer")
            .param("id",input.addressId).param("customer",customer).query { rs,_ ->
                mapOf("name" to rs.getString("name"),"phone" to rs.getString("phone"),
                    "addressLine" to rs.getString("address_line"),"city" to rs.getString("city"),
                    "state" to rs.getString("state"),"pincode" to rs.getString("pincode"))
            }.optional().orElseThrow { MissingResource() }
        require(input.items.map { it.productId }.distinct().size==input.items.size)
        val id = UUID.randomUUID().toString()
        // Lock all requested SKUs in a stable order before taking one database pricing timestamp.
        input.items.sortedBy { it.productId }.forEach { line ->
            jdbc.sql("SELECT id FROM commerce.product WHERE id=:id AND active=true FOR UPDATE")
                .param("id",line.productId).query(String::class.java).optional().orElseThrow { MissingResource() }
        }
        val pricedAt=acceptedAt ?: catalog.databaseTime()
        data class PricedLine(val input: OrderLineInput,val product: ProductView,val discount: Long,val total: Long)
        val prices = input.items.sortedBy { it.productId }.map { line ->
            val product=catalog.productAt(line.productId,pricedAt)
            val discount=catalog.lineDiscount(line.productId,line.quantity,pricedAt)
            if(jdbc.sql("UPDATE commerce.product SET stock=stock-:q WHERE id=:id AND stock>=:q")
                .param("q",line.quantity).param("id",line.productId).update()!=1) throw StateConflict()
            PricedLine(line,product,discount,Money.line(product.basePriceMinor,line.quantity)-discount)
        }
        val subtotal=Money.total(prices.map { it.total })
        // Existing store policy retained. Must be commercially approved before cutover.
        val shipping=shipping(subtotal)
        val total=Math.addExact(subtotal,shipping)
        require(total<=9_007_199_254_740_991L)
        jdbc.sql("""INSERT INTO commerce.orders(id,customer_id,total_minor,currency,payment_state,fulfillment_state,
            address_snapshot,idempotency_key,request_hash) VALUES(:id,:customer,:total,'INR','PAYMENT_SETUP_PENDING',
            'AWAITING_PAYMENT',CAST(:address AS jsonb),:key,:hash)""")
            .param("id",id).param("customer",customer).param("total",total)
            .param("address",mapper.writeValueAsString(address)).param("key",key).param("hash",requestHash).update()
        prices.forEach { priced ->
            jdbc.sql("""INSERT INTO commerce.order_line(order_id,product_id,quantity,total_minor,base_unit_price_minor,discount_minor,price_version,offer_title)
                VALUES(:order,:product,:q,:total,:base,:discount,:version,:offer)""")
                .param("order",id).param("product",priced.input.productId).param("q",priced.input.quantity).param("total",priced.total)
                .param("base",priced.product.basePriceMinor).param("discount",priced.discount).param("version",priced.product.priceVersion)
                .param("offer",priced.product.offerTitle).update()
        }
        val reservationSeconds=env.getProperty("CHECKOUT_RESERVATION_SECONDS",Long::class.java,900L)
        require(reservationSeconds in 60..3600)
        jdbc.sql("INSERT INTO commerce.stock_reservation(order_id,state,expires_at) VALUES(:order,'ACTIVE',clock_timestamp()+(:seconds * interval '1 second'))")
            .param("order",id).param("seconds",reservationSeconds).update()
        jdbc.sql("INSERT INTO commerce.outbox(id,aggregate_id,event_type,payload) VALUES(:id,:order,'PaymentSetupRequested',CAST(:payload AS jsonb))")
            .param("id",UUID.randomUUID().toString()).param("order",id)
            .param("payload",mapper.writeValueAsString(mapOf("orderId" to id))).update()
        return order(customer,id)
    }
    fun order(customer: String,id: String): OrderView = jdbc.sql("""
        SELECT id,total_minor,currency,payment_state,fulfillment_state,created_at FROM commerce.order_fulfillment_progress
        WHERE id=:id AND customer_id=:customer""").param("id",id).param("customer",customer)
        .query { rs,_ -> OrderView(rs.getString("id"),rs.getLong("total_minor"),rs.getString("currency"),
            rs.getString("payment_state"),rs.getString("fulfillment_state"),rs.getTimestamp("created_at").toInstant()) }
        .optional().orElseThrow { MissingResource() }
    fun orders(customer: String): List<OrderView> = jdbc.sql("""
        SELECT id,total_minor,currency,payment_state,fulfillment_state,created_at FROM commerce.order_fulfillment_progress
        WHERE customer_id=:customer ORDER BY created_at DESC LIMIT 100""").param("customer",customer)
        .query { rs,_ -> OrderView(rs.getString("id"),rs.getLong("total_minor"),rs.getString("currency"),
            rs.getString("payment_state"),rs.getString("fulfillment_state"),rs.getTimestamp("created_at").toInstant()) }.list()
    fun shipments(customer: String,id: String): List<ShipmentView> {
        order(customer,id)
        return jdbc.sql("SELECT * FROM commerce.shipment WHERE order_id=:order ORDER BY id")
            .param("order",id).query { rs,_ ->
                val shipment=rs.getString("id")
                val events=jdbc.sql("SELECT state,occurred_at FROM commerce.tracking_event WHERE shipment_id=:id ORDER BY occurred_at")
                    .param("id",shipment).query { ev,_ -> TrackingView(ev.getString("state"),ev.getTimestamp("occurred_at").toInstant()) }.list()
                ShipmentView(shipment,rs.getString("state"),"Amazon Shipping",rs.getString("tracking_id"),
                    rs.getTimestamp("estimated_delivery")?.toInstant(),rs.getTimestamp("updated_at").toInstant(),events)
            }.list()
    }
    fun notifications(customer: String): List<NotificationView> = jdbc.sql("""
        SELECT id,order_id,message,created_at,read_at FROM commerce.notification
        WHERE customer_id=:customer ORDER BY created_at DESC LIMIT 100""").param("customer",customer)
        .query { rs,_ -> NotificationView(rs.getString("id"),rs.getString("order_id"),rs.getString("message"),
            rs.getTimestamp("created_at").toInstant(),rs.getTimestamp("read_at")!=null) }.list()
    fun readNotification(customer: String,id: String) {
        if(jdbc.sql("UPDATE commerce.notification SET read_at=COALESCE(read_at,now()) WHERE id=:id AND customer_id=:customer")
            .param("id",id).param("customer",customer).update()!=1) throw MissingResource()
    }
}
