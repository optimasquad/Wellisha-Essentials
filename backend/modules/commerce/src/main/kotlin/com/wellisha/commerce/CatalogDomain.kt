package com.wellisha.commerce

import jakarta.validation.Valid
import jakarta.validation.constraints.*
import java.math.BigInteger
import java.time.Instant

enum class OfferKind { PERCENTAGE, FIXED_AMOUNT, BUNDLE_PRICE, BUY_X_GET_Y }
data class OfferInput(
    @field:NotBlank @field:Size(max=80) val title: String,
    val kind: OfferKind,
    @field:Min(0) val value: Long,
    val startsAt: Instant, val endsAt: Instant,
    @field:Min(1) @field:Max(100) val buyQuantity: Int = 1,
    @field:Min(0) @field:Max(99) val freeQuantity: Int = 0
)
data class PricingInput(
    @field:Min(0) val version: Long,
    @field:Min(0) @field:Max(1801439850948) val basePriceMinor: Long,
    @field:Size(max=10) @field:Valid val offers: List<OfferInput>,
    @field:NotBlank @field:Size(max=240) val reason: String
)
data class PricingConfiguration(val version: Long,val basePriceMinor: Long,val offers: List<OfferInput>)
data class CategoryView(val id: String, val name: String, val slug: String)
data class CatalogPage(val items: List<ProductView>, val page: Int, val hasMore: Boolean, val pricedAt: Instant, val refreshAfterMs: Long)
data class ProductDetailView(val product: ProductView, val pricedAt: Instant, val refreshAfterMs: Long)
data class CartItemInput(@field:NotBlank @field:Size(max=100) val productId: String, @field:Min(1) @field:Max(100) val quantity: Int)
data class CartQuantityInput(@field:Min(1) @field:Max(100) val quantity: Int)
data class CartItemView(val id: String, val quantity: Int, val product: ProductView, val lineTotalMinor: Long, val lineDiscountMinor: Long, val purchasable: Boolean)
data class CartView(val items: List<CartItemView>, val subtotalMinor: Long, val savingsMinor: Long, val currency: String, val pricedAt: Instant, val refreshAfterMs: Long)

object PricingRules {
    // Percentage values use basis points: 1500 is 15%. Round discount down to a minor unit.
    fun discount(base: Long, quantity: Int, offer: OfferInput?): Long {
        Money.line(base, quantity) // Validate range and overflow even when no offer applies.
        if(offer == null || quantity < offer.buyQuantity) return 0
        return when (offer.kind) {
            OfferKind.PERCENTAGE -> {
                require(offer.value in 1..10000 && offer.freeQuantity == 0)
                val perUnit=BigInteger.valueOf(base).multiply(BigInteger.valueOf(offer.value)).divide(BigInteger.valueOf(10000)).longValueExact()
                Math.multiplyExact(perUnit,quantity.toLong())
            }
            OfferKind.FIXED_AMOUNT -> { require(offer.value in 1..base && offer.freeQuantity == 0); Money.line(offer.value,quantity) }
            OfferKind.BUNDLE_PRICE -> {
                require(offer.buyQuantity >= 2 && offer.freeQuantity == 0 && offer.value in 0..Money.line(base,offer.buyQuantity))
                Math.multiplyExact(quantity.toLong()/offer.buyQuantity,Money.line(base,offer.buyQuantity)-offer.value)
            }
            OfferKind.BUY_X_GET_Y -> {
                require(offer.value == 0L && offer.freeQuantity > 0 && offer.buyQuantity+offer.freeQuantity <= 100)
                val free=(quantity/(offer.buyQuantity+offer.freeQuantity))*offer.freeQuantity
                if(free==0) 0 else Money.line(base,free)
            }
        }
    }
    fun validate(input: PricingInput) {
        require(input.version >= 0 && input.basePriceMinor in 0..1801439850948L)
        val sorted = input.offers.sortedBy { it.startsAt }
        sorted.forEach {
            require(it.endsAt > it.startsAt && it.buyQuantity in 1..100 && it.freeQuantity in 0..99)
            // Validate the rule using a qualifying quantity, including a full buy-X/get-Y group.
            discount(input.basePriceMinor, if(it.kind==OfferKind.BUY_X_GET_Y) it.buyQuantity+it.freeQuantity else it.buyQuantity, it)
        }
        sorted.zipWithNext().forEach { (a,b) -> require(a.endsAt <= b.startsAt) { "Offers must not overlap" } }
    }
    fun summary(offer: OfferInput): String {
        fun decimal(value: Long) = java.math.BigDecimal.valueOf(value,2).stripTrailingZeros().toPlainString()
        val threshold=if(offer.buyQuantity==1) "" else " when you buy ${offer.buyQuantity} or more"
        return when(offer.kind) {
            OfferKind.PERCENTAGE -> "${decimal(offer.value)}% off each$threshold"
            OfferKind.FIXED_AMOUNT -> "₹${decimal(offer.value)} off each$threshold"
            OfferKind.BUNDLE_PRICE -> "${offer.buyQuantity} for ₹${decimal(offer.value)}"
            OfferKind.BUY_X_GET_Y -> "Buy ${offer.buyQuantity}, get ${offer.freeQuantity} free. Add ${offer.buyQuantity+offer.freeQuantity} units per group."
        }
    }
}
