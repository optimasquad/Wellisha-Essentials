package com.wellisha.commerce

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.core.env.Environment
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

data class QuoteLine(val productId: String,val quantity: Int,val basePriceMinor: Long,val discountMinor: Long,val totalMinor: Long,val priceVersion: Long)
data class CheckoutQuote(val id: String,val addressId: String,val items: List<QuoteLine>,val subtotalMinor: Long,val shippingMinor: Long,val totalMinor: Long,val currency: String,val expiresAt: Instant)
data class AcceptQuoteInput(@field:jakarta.validation.constraints.NotBlank @field:jakarta.validation.constraints.Size(max=100) val quoteId: String)

@Repository
class CheckoutRepository(private val jdbc: JdbcClient,private val mapper: ObjectMapper,private val catalog: CatalogPricingRepository,
    private val orders: OrderAndShipmentRepository,private val env: Environment) {
    private fun lines(input: CreateOrderInput,at: Instant): List<QuoteLine> = input.items.sortedBy { it.productId }.map {
        val product=catalog.productAt(it.productId,at)
        val stock=jdbc.sql("SELECT stock FROM commerce.product WHERE id=:id AND active=true").param("id",it.productId)
            .query(Int::class.java).optional().orElseThrow { MissingResource() }
        if(stock<it.quantity) throw StateConflict()
        val discount=catalog.lineDiscount(it.productId,it.quantity,at)
        QuoteLine(it.productId,it.quantity,product.basePriceMinor,discount,Money.line(product.basePriceMinor,it.quantity)-discount,product.priceVersion)
    }
    @Transactional
    fun quote(customer: String,input: CreateOrderInput): CheckoutQuote {
        require(input.items.isNotEmpty() && input.items.size<=50 && input.items.map { it.productId }.distinct().size==input.items.size)
        val addressVersion=jdbc.sql("SELECT version FROM commerce.address WHERE id=:id AND customer_id=:customer FOR SHARE")
            .param("id",input.addressId).param("customer",customer).query(Long::class.java).optional().orElseThrow { MissingResource() }
        // Stable SKU locks give a coherent quote while pricing edits and stock writes wait.
        input.items.sortedBy { it.productId }.forEach {
            jdbc.sql("SELECT id FROM commerce.product WHERE id=:id AND active=true FOR SHARE").param("id",it.productId)
                .query(String::class.java).optional().orElseThrow { MissingResource() }
        }
        val at=catalog.databaseTime()
        val priced=lines(input,at)
        val subtotal=Money.total(priced.map { it.totalMinor })
        val shipping=orders.shipping(subtotal)
        val ttl=env.getProperty("CHECKOUT_QUOTE_SECONDS",Long::class.java,300L)
        require(ttl in 30..900)
        val result=CheckoutQuote(UUID.randomUUID().toString(),input.addressId,priced,subtotal,shipping,Math.addExact(subtotal,shipping),"INR",at.plusSeconds(ttl))
        val max=env.getProperty("CHECKOUT_MAX_TOTAL_MINOR",Long::class.java,10_000_000L)
        require(max in 100..9_007_199_254_740_991L && result.totalMinor in 100..max)
        jdbc.sql("""INSERT INTO commerce.checkout_quote(id,customer_id,address_id,address_version,input,price_snapshot,subtotal_minor,shipping_minor,total_minor,created_at,expires_at)
            VALUES(:id,:customer,:address,:version,CAST(:input AS jsonb),CAST(:snapshot AS jsonb),:subtotal,:shipping,:total,:at,:expires)""")
            .param("id",result.id).param("customer",customer).param("address",input.addressId).param("version",addressVersion)
            .param("input",mapper.writeValueAsString(input)).param("snapshot",mapper.writeValueAsString(result))
            .param("subtotal",subtotal).param("shipping",shipping).param("total",result.totalMinor).param("at",java.sql.Timestamp.from(at))
            .param("expires",java.sql.Timestamp.from(result.expiresAt)).update()
        return result
    }
    fun view(customer: String,id: String): CheckoutQuote = jdbc.sql("SELECT price_snapshot::text FROM commerce.checkout_quote WHERE id=:id AND customer_id=:customer")
        .param("id",id).param("customer",customer).query(String::class.java).optional().orElseThrow { MissingResource() }
        .let { mapper.readValue(it,CheckoutQuote::class.java) }

    @Transactional
    fun accept(customer: String,key: String,id: String): OrderView {
        require(key.matches(Regex("[A-Za-z0-9_-]{16,100}")))
        jdbc.sql("SELECT id FROM commerce.customer WHERE id=:customer FOR UPDATE").param("customer",customer).query(String::class.java).single()
        data class Stored(val input: String,val version: Long,val accepted: String?,val expires: Instant)
        val stored=jdbc.sql("SELECT input::text,address_version,accepted_order_id,expires_at FROM commerce.checkout_quote WHERE id=:id AND customer_id=:customer FOR UPDATE")
            .param("id",id).param("customer",customer).query { rs,_ -> Stored(rs.getString("input"),rs.getLong("address_version"),rs.getString("accepted_order_id"),rs.getTimestamp("expires_at").toInstant()) }
            .optional().orElseThrow { MissingResource() }
        if(stored.accepted!=null) {
            val sameKey=jdbc.sql("SELECT idempotency_key FROM commerce.orders WHERE id=:id").param("id",stored.accepted).query(String::class.java).single()
            if(sameKey!=key) throw StateConflict()
            return orders.order(customer,stored.accepted)
        }
        val input=mapper.readValue(stored.input,CreateOrderInput::class.java)
        val addressVersion=jdbc.sql("SELECT version FROM commerce.address WHERE id=:id AND customer_id=:customer FOR SHARE")
            .param("id",input.addressId).param("customer",customer).query(Long::class.java).optional().orElseThrow { MissingResource() }
        input.items.sortedBy { it.productId }.forEach {
            jdbc.sql("SELECT id FROM commerce.product WHERE id=:id AND active=true FOR UPDATE").param("id",it.productId)
                .query(String::class.java).optional().orElseThrow { MissingResource() }
        }
        val at=catalog.databaseTime()
        if(!at.isBefore(stored.expires) || addressVersion!=stored.version) throw StateConflict()
        val accepted=view(customer,id)
        val current=lines(input,at)
        if(current!=accepted.items || orders.shipping(Money.total(current.map { it.totalMinor }))!=accepted.shippingMinor) throw StateConflict()
        // A key may not accept two different quotes, even if their contents happen to match.
        if(jdbc.sql("SELECT count(*) FROM commerce.orders WHERE customer_id=:customer AND idempotency_key=:key")
            .param("customer",customer).param("key",key).query(Long::class.java).single()!=0L) throw StateConflict()
        val order=orders.createOrder(customer,key,input,at)
        check(order.totalMinor==accepted.totalMinor)
        jdbc.sql("UPDATE commerce.checkout_quote SET accepted_order_id=:order WHERE id=:id").param("order",order.id).param("id",id).update()
        return order
    }
}
