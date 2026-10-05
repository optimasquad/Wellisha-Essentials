package com.wellisha.api

import com.wellisha.commerce.*
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*

data class StaffOrderLine(val productId: String,val name: String,val quantity: Int,val totalMinor: Long,val allocatedQuantity: Int)
data class StaffOrderOperations(val order: OrderView,val items: List<StaffOrderLine>,val parcels: List<ParcelView>,val refunds: List<RefundView>)
@RestController
class StaffOperationsController(private val jdbc: JdbcClient,private val orders: OrderAndShipmentRepository,private val shipping: ShippingRepository,private val customers: CustomerAddressRepository) {
    private fun authorize(jwt: Jwt,permission: String) {
        val count=jdbc.sql("SELECT count(*) FROM commerce.staff_permission WHERE issuer=:issuer AND subject=:subject AND permission=:permission")
            .param("issuer",jwt.issuer.toString()).param("subject",jwt.subject).param("permission",permission).query(Long::class.java).single()
        if(count==0L) throw AccessDeniedException("Operations permission required")
    }
    @GetMapping("/v1/staff/orders") fun list(@AuthenticationPrincipal jwt: Jwt): List<OrderView> {
        authorize(jwt,"orders.operations.read")
        return jdbc.sql("SELECT id,total_minor,currency,payment_state,fulfillment_state,created_at FROM commerce.order_fulfillment_progress ORDER BY created_at DESC,id LIMIT 50")
            .query { rs,_ -> OrderView(rs.getString(1),rs.getLong(2),rs.getString(3),rs.getString(4),rs.getString(5),rs.getTimestamp(6).toInstant()) }.list()
    }
    @GetMapping("/v1/staff/orders/{id}/operations") fun view(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String): StaffOrderOperations {
        authorize(jwt,"orders.operations.read")
        val customer=jdbc.sql("SELECT customer_id FROM commerce.orders WHERE id=:id").param("id",id).query(String::class.java).optional().orElseThrow { MissingResource() }
        val items=jdbc.sql("SELECT l.product_id,p.name,l.quantity,l.total_minor,(SELECT COALESCE(sum(pl.quantity),0) FROM commerce.parcel_line pl JOIN commerce.parcel pa ON pa.id=pl.parcel_id WHERE pa.order_id=l.order_id AND pl.product_id=l.product_id) AS allocated FROM commerce.order_line l JOIN commerce.product p ON p.id=l.product_id WHERE l.order_id=:id ORDER BY l.product_id")
            .param("id",id).query { rs,_ -> StaffOrderLine(rs.getString(1),rs.getString(2),rs.getInt(3),rs.getLong(4),rs.getInt(5)) }.list()
        val parcels=jdbc.sql("SELECT id,order_id,state,version FROM commerce.shipment WHERE order_id=:id ORDER BY id").param("id",id)
            .query { rs,_ -> ParcelView(rs.getString(1),rs.getString(2),rs.getString(3),rs.getLong(4)) }.list()
        val refunds=jdbc.sql("SELECT id,order_id,amount_minor,state FROM commerce.refund_request WHERE order_id=:id ORDER BY created_at").param("id",id)
            .query { rs,_ -> RefundView(rs.getString(1),rs.getString(2),rs.getLong(3),rs.getString(4)) }.list()
        return StaffOrderOperations(orders.order(customer,id),items,parcels,refunds)
    }
    @PostMapping("/v1/staff/shipments/{id}/cancel") @ResponseStatus(HttpStatus.ACCEPTED)
    fun cancel(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String,@Valid @RequestBody input: ShipmentCancellationInput): ParcelView {
        authorize(jwt,"fulfillment.cancel.write");return shipping.requestCancellation(id,customers.resolve(jwt.issuer.toString(),jwt.subject).id,input)
    }
}
