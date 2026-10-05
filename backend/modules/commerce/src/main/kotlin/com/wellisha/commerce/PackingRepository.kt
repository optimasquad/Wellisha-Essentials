package com.wellisha.commerce

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

data class ParcelInput(
    @field:jakarta.validation.constraints.Min(1) @field:jakarta.validation.constraints.Max(30000) val weightGrams: Int,
    @field:jakarta.validation.constraints.Min(1) @field:jakarta.validation.constraints.Max(2000) val lengthMm: Int,
    @field:jakarta.validation.constraints.Min(1) @field:jakarta.validation.constraints.Max(2000) val widthMm: Int,
    @field:jakarta.validation.constraints.Min(1) @field:jakarta.validation.constraints.Max(2000) val heightMm: Int,
    @field:jakarta.validation.constraints.Size(min=1,max=50) @field:jakarta.validation.Valid val items: List<OrderLineInput>
)
data class ParcelView(val id: String,val orderId: String,val state: String,val version: Long)
data class ReadyParcelInput(@field:jakarta.validation.constraints.Min(0) val version: Long)
data class ShipmentCancellationInput(@field:jakarta.validation.constraints.Min(0) val version: Long,@field:jakarta.validation.constraints.NotBlank @field:jakarta.validation.constraints.Size(max=240) val reason: String)

@Repository
class PackingRepository(private val jdbc: JdbcClient,private val mapper: ObjectMapper) {
    @Transactional fun create(actor: String,order: String,key: String,input: ParcelInput): ParcelView {
        require(key.matches(Regex("[A-Za-z0-9_-]{16,100}")) && input.items.isNotEmpty() && input.items.size<=50 && input.items.map { it.productId }.distinct().size==input.items.size)
        val state=jdbc.sql("SELECT payment_state,fulfillment_state FROM commerce.orders WHERE id=:id FOR UPDATE").param("id",order)
            .query { rs,_ -> rs.getString("payment_state") to rs.getString("fulfillment_state") }.optional().orElseThrow { MissingResource() }
        if(state.first!="CAPTURED" || state.second in setOf("CANCELLED","MANUAL_REVIEW")) throw StateConflict()
        if(jdbc.sql("SELECT count(*) FROM commerce.refund_request WHERE order_id=:id AND state!='FAILED'").param("id",order).query(Long::class.java).single()>0) throw StateConflict()
        val hash=java.security.MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(input)).joinToString("") { "%02x".format(it) }
        val prior=jdbc.sql("SELECT id,request_hash FROM commerce.parcel WHERE order_id=:order AND idempotency_key=:key")
            .param("order",order).param("key",key).query { rs,_ -> rs.getString("id") to rs.getString("request_hash") }.optional()
        if(prior.isPresent) { if(prior.get().second!=hash) throw StateConflict();return view(prior.get().first) }
        input.items.forEach { line ->
            val ordered=jdbc.sql("SELECT quantity FROM commerce.order_line WHERE order_id=:order AND product_id=:product").param("order",order).param("product",line.productId)
                .query(Int::class.java).optional().orElseThrow { StateConflict() }
            val allocated=jdbc.sql("SELECT COALESCE(sum(l.quantity),0) FROM commerce.parcel_line l JOIN commerce.parcel p ON p.id=l.parcel_id WHERE p.order_id=:order AND l.product_id=:product")
                .param("order",order).param("product",line.productId).query(Int::class.java).single()
            require(line.quantity in 1..100)
            if(line.quantity>ordered-allocated) throw StateConflict()
        }
        val id=UUID.randomUUID().toString()
        jdbc.sql("INSERT INTO commerce.shipment(id,order_id,package_reference) VALUES(:id,:order,:id)").param("id",id).param("order",order).update()
        jdbc.sql("INSERT INTO commerce.parcel(id,order_id,weight_grams,length_mm,width_mm,height_mm,actor_id,idempotency_key,request_hash) VALUES(:id,:order,:weight,:length,:width,:height,:actor,:key,:hash)")
            .param("id",id).param("order",order).param("weight",input.weightGrams).param("length",input.lengthMm).param("width",input.widthMm).param("height",input.heightMm)
            .param("actor",actor).param("key",key).param("hash",hash).update()
        input.items.forEach { jdbc.sql("INSERT INTO commerce.parcel_line(parcel_id,product_id,quantity) VALUES(:id,:product,:quantity)").param("id",id).param("product",it.productId).param("quantity",it.quantity).update() }
        return view(id)
    }
    fun view(id: String): ParcelView=jdbc.sql("SELECT id,order_id,state,version FROM commerce.shipment WHERE id=:id").param("id",id)
        .query { rs,_ -> ParcelView(rs.getString("id"),rs.getString("order_id"),rs.getString("state"),rs.getLong("version")) }.optional().orElseThrow { MissingResource() }
    @Transactional fun ready(id: String,version: Long,actor: String?=null): ParcelView {
        val parcel=view(id)
        val payment=jdbc.sql("SELECT payment_state FROM commerce.orders WHERE id=:id FOR UPDATE").param("id",parcel.orderId).query(String::class.java).single()
        if(payment!="CAPTURED") throw StateConflict()
        if(jdbc.sql("SELECT count(*) FROM commerce.refund_request WHERE order_id=:id AND state!='FAILED'").param("id",parcel.orderId).query(Long::class.java).single()>0) throw StateConflict()
        val current=jdbc.sql("SELECT state,version FROM commerce.shipment WHERE id=:id FOR UPDATE").param("id",id).query { rs,_ -> rs.getString("state") to rs.getLong("version") }.single()
        if(current.first=="PACKED_READY" && current.second==version+1) return view(id)
        if(current.first!="AWAITING_PACKING" || current.second!=version) throw StateConflict()
        jdbc.sql("UPDATE commerce.shipment SET state='PACKED_READY',version=version+1,updated_at=clock_timestamp() WHERE id=:id").param("id",id).update()
        if(actor!=null)jdbc.sql("INSERT INTO commerce.operations_audit(id,actor_id,target_id,action,reason) VALUES(:audit,:actor,:id,'PACKED_READY','Staff confirmed parcel measurements and contents')")
            .param("audit",UUID.randomUUID().toString()).param("actor",actor).param("id",id).update()
        jdbc.sql("INSERT INTO commerce.outbox(id,aggregate_id,event_type,payload) VALUES(:event,:id,'PackagePackedReady',CAST(:payload AS jsonb))")
            .param("event",UUID.randomUUID().toString()).param("id",id).param("payload",mapper.writeValueAsString(mapOf("packageId" to id))).update()
        return view(id)
    }
}
