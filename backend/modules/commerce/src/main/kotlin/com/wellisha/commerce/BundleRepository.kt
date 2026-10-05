package com.wellisha.commerce

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
class BundleRepository(private val jdbc: JdbcClient) {
    fun configuration(id: String): BundleConfiguration {
        val version=jdbc.sql("SELECT price_version FROM commerce.product WHERE id=:id").param("id",id).query(Long::class.java).optional().orElseThrow { MissingResource() }
        val items=jdbc.sql("SELECT component_product_id,quantity FROM commerce.product_bundle_component WHERE bundle_product_id=:id ORDER BY component_product_id")
            .param("id",id).query { rs,_ -> OrderLineInput(rs.getString(1),rs.getInt(2)) }.list()
        return BundleConfiguration(version,items)
    }
    @Transactional fun update(id: String,actor: String,input: BundleInput): BundleConfiguration {
        require(input.items.size<=10 && input.items.map { it.productId }.distinct().size==input.items.size && input.items.none { it.productId==id || it.quantity !in 1..100 })
        // Serialize catalog recipe edits. All SKU locks follow the checkout lock order.
        jdbc.sql("SELECT pg_advisory_xact_lock(742391)").query { _,_ -> true }.single()
        (input.items.map { it.productId }+id).distinct().sorted().forEach { product ->
            jdbc.sql("SELECT id FROM commerce.product WHERE id=:id FOR UPDATE").param("id",product).query(String::class.java).optional().orElseThrow { MissingResource() }
        }
        if(configuration(id).version!=input.version) throw StateConflict()
        val nested=input.items.any { line -> jdbc.sql("SELECT count(*) FROM commerce.product_bundle_component WHERE bundle_product_id=:id").param("id",line.productId).query(Long::class.java).single()>0 }
        val isComponent=jdbc.sql("SELECT count(*) FROM commerce.product_bundle_component WHERE component_product_id=:id").param("id",id).query(Long::class.java).single()>0
        require(!nested && (input.items.isEmpty() || !isComponent))
        jdbc.sql("DELETE FROM commerce.product_bundle_component WHERE bundle_product_id=:id").param("id",id).update()
        input.items.forEach { jdbc.sql("INSERT INTO commerce.product_bundle_component(bundle_product_id,component_product_id,quantity) VALUES(:id,:component,:quantity)")
            .param("id",id).param("component",it.productId).param("quantity",it.quantity).update() }
        // Contents are part of the customer's quote. Bump its version while retaining schedules.
        jdbc.sql("INSERT INTO commerce.product_offer(id,product_id,price_version,title,kind,value,buy_quantity,free_quantity,starts_at,ends_at) SELECT md5(id||CAST(:version AS text)),product_id,:version,title,kind,value,buy_quantity,free_quantity,starts_at,ends_at FROM commerce.product_offer WHERE product_id=:id AND price_version=:old")
            .param("id",id).param("version",input.version+1).param("old",input.version).update()
        jdbc.sql("UPDATE commerce.product SET price_version=price_version+1 WHERE id=:id").param("id",id).update()
        jdbc.sql("INSERT INTO commerce.operations_audit(id,actor_id,target_id,action,reason) VALUES(:audit,:actor,:id,'BUNDLE_CONTENTS_CHANGED',:reason)")
            .param("audit",java.util.UUID.randomUUID().toString()).param("actor",actor).param("id",id).param("reason",input.reason).update()
        return configuration(id)
    }
}
