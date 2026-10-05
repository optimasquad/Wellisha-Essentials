package com.wellisha.commerce

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Isolation
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
class CartRepository(private val jdbc: JdbcClient,private val catalog: CatalogPricingRepository) {
    private fun lock(customer: String) { jdbc.sql("SELECT id FROM commerce.customer WHERE id=:id FOR UPDATE").param("id",customer).query(String::class.java).single() }
    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    fun view(customer: String): CartView {
        val at=catalog.databaseTime()
        val items=jdbc.sql("SELECT id,product_id,quantity FROM commerce.cart_item WHERE customer_id=:owner ORDER BY created_at,id")
            .param("owner",customer).query { rs,_ -> Triple(rs.getString("id"),rs.getString("product_id"),rs.getInt("quantity")) }.list()
            .map { (id,productId,quantity) ->
                val product=catalog.productAt(productId,at,false)
                val enough=jdbc.sql("SELECT active AND stock>=:quantity FROM commerce.product WHERE id=:id")
                    .param("id",productId).param("quantity",quantity).query(Boolean::class.java).single()
                val discount=catalog.lineDiscount(productId,quantity,at)
                CartItemView(id,quantity,product,Money.line(product.basePriceMinor,quantity)-discount,discount,enough)
            }
        val subtotal=Money.total(items.map { it.lineTotalMinor })
        val savings=Money.total(items.map { it.lineDiscountMinor })
        require(subtotal <= 9007199254740991L && savings <= 9007199254740991L)
        return CartView(items,subtotal,savings,"INR",at,catalog.refreshAfter(at))
    }
    @Transactional fun add(customer: String,input: CartItemInput) {
        lock(customer)
        val product=catalog.productAt(input.productId,catalog.databaseTime())
        if(!product.available) throw StateConflict()
        val existing=jdbc.sql("SELECT quantity FROM commerce.cart_item WHERE customer_id=:owner AND product_id=:product")
            .param("owner",customer).param("product",input.productId).query(Int::class.java).optional().orElse(0)
        val quantity=Math.addExact(existing,input.quantity)
        val stock=jdbc.sql("SELECT stock FROM commerce.product WHERE id=:id").param("id",input.productId).query(Int::class.java).single()
        if(quantity !in 1..100 || quantity>stock) throw StateConflict()
        val count=jdbc.sql("SELECT count(*) FROM commerce.cart_item WHERE customer_id=:owner").param("owner",customer).query(Long::class.java).single()
        if(existing==0 && count>=50) throw StateConflict()
        jdbc.sql("""INSERT INTO commerce.cart_item(id,customer_id,product_id,quantity) VALUES(:id,:owner,:product,:quantity)
            ON CONFLICT(customer_id,product_id) DO UPDATE SET quantity=:quantity""")
            .param("id",UUID.randomUUID().toString()).param("owner",customer).param("product",input.productId).param("quantity",quantity).update()
    }
    @Transactional fun update(customer: String,id: String,input: CartQuantityInput) {
        lock(customer)
        val productId=jdbc.sql("SELECT product_id FROM commerce.cart_item WHERE id=:id AND customer_id=:owner")
            .param("id",id).param("owner",customer).query(String::class.java).optional().orElseThrow { MissingResource() }
        val stock=jdbc.sql("SELECT stock FROM commerce.product WHERE id=:id AND active=true").param("id",productId)
            .query(Int::class.java).optional().orElseThrow { StateConflict() }
        if(input.quantity>stock) throw StateConflict()
        jdbc.sql("UPDATE commerce.cart_item SET quantity=:quantity WHERE id=:id AND customer_id=:owner")
            .param("quantity",input.quantity).param("id",id).param("owner",customer).update()
    }
    fun delete(customer: String,id: String) {
        if(jdbc.sql("DELETE FROM commerce.cart_item WHERE id=:id AND customer_id=:owner")
            .param("id",id).param("owner",customer).update()!=1) throw MissingResource()
    }
}
