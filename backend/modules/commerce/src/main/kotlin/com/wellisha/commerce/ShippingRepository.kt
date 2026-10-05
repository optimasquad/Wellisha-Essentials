package com.wellisha.commerce

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

data class ShippingWork(val id: String,val orderId: String,val destination: JsonNode,val weightGrams: Int,val lengthMm: Int,val widthMm: Int,val heightMm: Int,val items: List<Map<String,Any>>)

@Repository
class ShippingRepository(private val jdbc: JdbcClient,private val mapper: ObjectMapper,private val notifications: NotificationRepository) {
    @Transactional fun begin(id: String): ShippingWork? {
        val parcel=jdbc.sql("SELECT order_id FROM commerce.parcel WHERE id=:id").param("id",id).query(String::class.java).optional().orElseThrow { MissingResource() }
        val order=jdbc.sql("SELECT payment_state,address_snapshot::text FROM commerce.orders WHERE id=:id FOR UPDATE").param("id",parcel)
            .query { rs,_ -> rs.getString("payment_state") to rs.getString("address_snapshot") }.single()
        if(order.first!="CAPTURED") return null
        if(jdbc.sql("SELECT count(*) FROM commerce.refund_request WHERE order_id=:id AND state!='FAILED'").param("id",parcel).query(Long::class.java).single()>0) throw StateConflict()
        val state=jdbc.sql("SELECT state FROM commerce.shipment WHERE id=:id FOR UPDATE").param("id",id).query(String::class.java).single()
        if(state!="PACKED_READY") return null
        val attempt=jdbc.sql("SELECT state FROM commerce.shipping_attempt WHERE parcel_id=:id").param("id",id).query(String::class.java).optional()
        if(attempt.isPresent && attempt.get() !in setOf("RATING","FAILED")) return null
        jdbc.sql("INSERT INTO commerce.shipping_attempt(parcel_id,state) VALUES(:id,'RATING') ON CONFLICT(parcel_id) DO UPDATE SET state='RATING',updated_at=clock_timestamp()")
            .param("id",id).update()
        val measurements=jdbc.sql("SELECT weight_grams,length_mm,width_mm,height_mm FROM commerce.parcel WHERE id=:id").param("id",id)
            .query { rs,_ -> listOf(rs.getInt(1),rs.getInt(2),rs.getInt(3),rs.getInt(4)) }.single()
        val items=jdbc.sql("SELECT l.product_id,l.quantity,p.name,p.sku,o.total_minor,o.quantity AS order_quantity FROM commerce.parcel_line l JOIN commerce.product p ON p.id=l.product_id JOIN commerce.order_line o ON o.order_id=:order AND o.product_id=l.product_id WHERE l.parcel_id=:id ORDER BY l.product_id")
            .param("order",parcel).param("id",id).query { rs,_ -> mapOf<String,Any>("description" to rs.getString("name"),"itemIdentifier" to rs.getString("sku"),"quantity" to rs.getInt("quantity"),
                "itemValue" to mapOf("unit" to "INR","value" to java.math.BigDecimal.valueOf(rs.getLong("total_minor"),2).divide(java.math.BigDecimal(rs.getInt("order_quantity")),2,java.math.RoundingMode.DOWN)),"isHazmat" to false) }.list()
        return ShippingWork(id,parcel,mapper.readTree(order.second),measurements[0],measurements[1],measurements[2],measurements[3],items)
    }
    @Transactional fun purchasing(id: String,token: String,rate: JsonNode,expires: Instant): Boolean {
        val order=jdbc.sql("SELECT order_id FROM commerce.parcel WHERE id=:id").param("id",id).query(String::class.java).single()
        val state=jdbc.sql("SELECT payment_state FROM commerce.orders WHERE id=:id FOR UPDATE").param("id",order).query(String::class.java).single()
        if(state!="CAPTURED" || expires<=Instant.now()) return false
        if(jdbc.sql("SELECT count(*) FROM commerce.refund_request WHERE order_id=:id AND state!='FAILED'").param("id",order).query(Long::class.java).single()>0) return false
        val changed=jdbc.sql("UPDATE commerce.shipping_attempt SET state='PURCHASING',request_token=:token,rate_id=:rate,carrier_id=:carrier,rate_snapshot=CAST(:snapshot AS jsonb),expires_at=:expires,updated_at=clock_timestamp() WHERE parcel_id=:id AND state='RATING'")
            .param("token",token).param("rate",rate.path("rateId").asText()).param("carrier",rate.path("carrierId").asText()).param("snapshot",mapper.writeValueAsString(rate))
            .param("expires",java.sql.Timestamp.from(expires)).param("id",id).update()
        if(changed==1) jdbc.sql("UPDATE commerce.shipment SET state='BOOKING_PENDING',version=version+1,updated_at=clock_timestamp() WHERE id=:id").param("id",id).update()
        return changed==1
    }
    fun unknown(id: String) {
        jdbc.sql("UPDATE commerce.shipping_attempt SET state='UNKNOWN',updated_at=clock_timestamp() WHERE parcel_id=:id AND state='PURCHASING'").param("id",id).update()
        jdbc.sql("UPDATE commerce.shipment SET state='BOOKING_UNKNOWN',updated_at=clock_timestamp() WHERE id=:id AND state='BOOKING_PENDING'").param("id",id).update()
    }
    @Transactional fun purchased(id: String,provider: String,tracking: String,estimate: Instant?) {
        require(provider.isNotBlank() && tracking.isNotBlank())
        if(jdbc.sql("UPDATE commerce.shipping_attempt SET state='DOCUMENT_PENDING',updated_at=clock_timestamp() WHERE parcel_id=:id AND state='PURCHASING'").param("id",id).update()!=1) throw StateConflict()
        jdbc.sql("UPDATE commerce.shipment SET state='LABEL_PENDING',provider_shipment_id=:provider,tracking_id=:tracking,carrier_id=(SELECT carrier_id FROM commerce.shipping_attempt WHERE parcel_id=:id),estimated_delivery=:estimate,version=version+1,updated_at=clock_timestamp() WHERE id=:id")
            .param("id",id).param("provider",provider).param("tracking",tracking).param("estimate",estimate?.let { java.sql.Timestamp.from(it) }).update()
    }
    @Transactional fun booked(id: String,provider: String,tracking: String,key: String,format: String,estimate: Instant?) {
        require(provider.isNotBlank() && tracking.isNotBlank() && format in setOf("PNG","PDF"))
        val changed=jdbc.sql("UPDATE commerce.shipping_attempt SET state='BOOKED',updated_at=clock_timestamp() WHERE parcel_id=:id AND state='DOCUMENT_PENDING'").param("id",id).update()
        if(changed!=1) return // Document recovery/redelivery may have completed concurrently.
        jdbc.sql("UPDATE commerce.shipment SET state=CASE WHEN state='LABEL_PENDING' THEN 'LABEL_READY' ELSE state END,provider_shipment_id=:provider,tracking_id=:tracking,label_key=:key,carrier_id=(SELECT carrier_id FROM commerce.shipping_attempt WHERE parcel_id=:id),estimated_delivery=COALESCE(:estimate,estimated_delivery),version=version+1,updated_at=clock_timestamp() WHERE id=:id")
            .param("id",id).param("provider",provider).param("tracking",tracking).param("key",key).param("estimate",estimate?.let { java.sql.Timestamp.from(it) }).update()
        jdbc.sql("INSERT INTO commerce.shipment_document(shipment_id,bucket_key,format) VALUES(:id,:key,:format)").param("id",id).param("key",key).param("format",format).update()
    }
    @Transactional fun requestCancellation(id: String,actor: String?=null,input: ShipmentCancellationInput?=null): ParcelView {
        val order=jdbc.sql("SELECT order_id FROM commerce.shipment WHERE id=:id").param("id",id).query(String::class.java).optional().orElseThrow { MissingResource() }
        jdbc.sql("SELECT id FROM commerce.orders WHERE id=:id FOR UPDATE").param("id",order).query(String::class.java).single()
        val current=jdbc.sql("SELECT state,cancellation_state,version FROM commerce.shipment WHERE id=:id FOR UPDATE").param("id",id).query { rs,_ -> Triple(rs.getString(1),rs.getString(2),rs.getLong(3)) }.single()
        if(current.first !in setOf("LABEL_READY","LABEL_PENDING","AWAITING_PICKUP")) throw StateConflict()
        if(current.second==null) {
            if(input!=null && input.version!=current.third) throw StateConflict()
            jdbc.sql("UPDATE commerce.shipment SET cancellation_state='PENDING',version=version+1 WHERE id=:id").param("id",id).update()
            jdbc.sql("INSERT INTO commerce.outbox(id,aggregate_id,event_type,payload) VALUES(:event,:id,'ShipmentCancellationRequested',CAST(:payload AS jsonb))")
                .param("event",java.util.UUID.randomUUID().toString()).param("id",id).param("payload",mapper.writeValueAsString(mapOf("shipmentId" to id))).update()
            if(actor!=null && input!=null)jdbc.sql("INSERT INTO commerce.operations_audit(id,actor_id,target_id,action,reason) VALUES(:audit,:actor,:id,'SHIPMENT_CANCEL_REQUESTED',:reason)")
                .param("audit",java.util.UUID.randomUUID().toString()).param("actor",actor).param("id",id).param("reason",input.reason).update()
        }
        return jdbc.sql("SELECT id,order_id,state,version FROM commerce.shipment WHERE id=:id").param("id",id).query { rs,_ -> ParcelView(rs.getString(1),rs.getString(2),rs.getString(3),rs.getLong(4)) }.single()
    }
    @Transactional fun beginCancellation(id: String): String? = jdbc.sql("UPDATE commerce.shipment SET cancellation_state='CALLING',updated_at=clock_timestamp() WHERE id=:id AND cancellation_state='PENDING' AND state IN ('LABEL_READY','LABEL_PENDING','AWAITING_PICKUP') RETURNING provider_shipment_id")
        .param("id",id).query(String::class.java).optional().orElse(null)
    @Transactional fun finishCancellation(id: String,confirmed: Boolean) {
        jdbc.sql("UPDATE commerce.shipment SET cancellation_state=:cancel,state=CASE WHEN :confirmed AND state IN ('LABEL_READY','LABEL_PENDING','AWAITING_PICKUP') THEN 'CANCELLED' ELSE state END,version=version+1,updated_at=clock_timestamp() WHERE id=:id AND cancellation_state='CALLING'")
            .param("cancel",if(confirmed)"CONFIRMED" else "UNKNOWN").param("confirmed",confirmed).param("id",id).update()
    }
    @Transactional fun tracking(id: String,events: List<Pair<String,Instant>>) {
        jdbc.sql("SELECT id FROM commerce.shipment WHERE id=:id FOR UPDATE").param("id",id).query(String::class.java).single()
        events.forEach { (provider,at) ->
            val event=java.security.MessageDigest.getInstance("SHA-256").digest("$provider:$at".toByteArray()).joinToString("") { "%02x".format(it) }
            jdbc.sql("INSERT INTO commerce.tracking_event(shipment_id,event_id,state,occurred_at) VALUES(:id,:event,:state,:at) ON CONFLICT DO NOTHING")
                .param("id",id).param("event",event).param("state",FulfillmentRules.customerState(provider)).param("at",java.sql.Timestamp.from(at)).update()
        }
        val latest=jdbc.sql("SELECT state,event_id FROM commerce.tracking_event WHERE shipment_id=:id ORDER BY occurred_at DESC,event_id DESC LIMIT 1").param("id",id)
            .query { rs,_ -> rs.getString(1) to rs.getString(2) }.optional()
        if(latest.isPresent) {
            val (state,event)=latest.get()
            val changed=jdbc.sql("UPDATE commerce.shipment SET state=:state,updated_at=clock_timestamp(),version=version+1 WHERE id=:id AND state!=:state")
                .param("state",state).param("id",id).update()
            if(changed==1) {
                val owner=jdbc.sql("SELECT o.id,o.customer_id FROM commerce.orders o JOIN commerce.shipment s ON s.order_id=o.id WHERE s.id=:id").param("id",id)
                    .query { rs,_ -> rs.getString(1) to rs.getString(2) }.single()
                val message=when(state) { "PICKED_UP" -> "Your parcel has been picked up.";"DELIVERED" -> "Your parcel has been delivered.";"OUT_FOR_DELIVERY" -> "Your parcel is out for delivery.";else -> "Your parcel status: "+state.lowercase().replace('_',' ') }
                jdbc.sql("INSERT INTO commerce.notification(id,customer_id,order_id,event_id,message) VALUES(:notification,:customer,:order,:event,:message) ON CONFLICT DO NOTHING")
                    .param("notification",java.util.UUID.randomUUID().toString()).param("customer",owner.second).param("order",owner.first).param("event","tracking:$id:$event").param("message",message).update()
                notifications.enqueue(owner.second,owner.first,"tracking:$id:$event",message)
            }
        }
    }
}
