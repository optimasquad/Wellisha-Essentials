package com.wellisha.commerce

import jakarta.validation.constraints.*
import java.time.Instant

class MissingResource : RuntimeException()
class StateConflict : RuntimeException()
data class Customer(val id: String)
data class Address(
    val id: String, val name: String, val phone: String, val addressLine: String,
    val city: String, val state: String, val pincode: String, val version: Long
)
data class AddressInput(
    @field:NotBlank @field:Size(max=120) val name: String,
    @field:Pattern(regexp="^[+0-9 ()-]{8,20}$") val phone: String,
    @field:NotBlank @field:Size(max=240) val addressLine: String,
    @field:NotBlank @field:Size(max=80) val city: String,
    @field:NotBlank @field:Size(max=80) val state: String,
    @field:Pattern(regexp="^[1-9][0-9]{5}$") val pincode: String
)
data class VersionedAddressInput(val version: Long, @field:jakarta.validation.Valid val address: AddressInput)
data class ProductView(
    val id: String, val name: String, val sku: String, val priceMinor: Long, val available: Boolean,
    val slug: String = id, val description: String = "", val image: String = "/products/wellisha-hero.jpg",
    val categoryId: String? = null, val basePriceMinor: Long = priceMinor, val discountMinor: Long = 0,
    val offerTitle: String? = null, val priceVersion: Long = 0, val currency: String = "INR", val offerSummary: String? = null
)
data class OrderLineInput(@field:NotBlank @field:Size(max=100) val productId: String, @field:Min(1) @field:Max(100) val quantity: Int)
data class CreateOrderInput(
    @field:NotBlank @field:Size(max=100) val addressId: String,
    @field:Size(min=1,max=50) @field:jakarta.validation.Valid val items: List<OrderLineInput>
)
data class OrderView(
    val id: String, val totalMinor: Long, val currency: String, val paymentState: String,
    val fulfillmentState: String, val createdAt: Instant
)
data class ShipmentView(
    val id: String, val state: String, val carrier: String, val trackingId: String?,
    val estimatedDelivery: Instant?, val updatedAt: Instant, val events: List<TrackingView>
)
data class TrackingView(val state: String, val occurredAt: Instant)
data class NotificationView(val id: String, val orderId: String, val message: String, val createdAt: Instant, val read: Boolean)

object Money {
    fun line(priceMinor: Long, quantity: Int): Long {
        require(priceMinor >= 0 && quantity in 1..100)
        return Math.multiplyExact(priceMinor, quantity.toLong())
    }
    fun total(lines: List<Long>): Long = lines.fold(0L) { a,b -> require(b >= 0); Math.addExact(a,b) }
}
object FulfillmentRules {
    fun canBook(payment: String, packing: String): Boolean = payment == "CAPTURED" && packing == "PACKED_READY"
    fun customerState(providerState: String): String = when(providerState) {
        "ReadyForReceive" -> "AWAITING_PICKUP"
        "PickupDone" -> "PICKED_UP"
        "InTransit" -> "IN_TRANSIT"
        "OutForDelivery" -> "OUT_FOR_DELIVERY"
        "Delivered" -> "DELIVERED"
        "ReturnInitiated", "ReturnedToSeller" -> "RETURN_TO_ORIGIN"
        else -> "DELIVERY_EXCEPTION"
    }
}
