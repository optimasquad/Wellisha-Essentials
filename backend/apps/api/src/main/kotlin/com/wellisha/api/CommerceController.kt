package com.wellisha.api

import com.wellisha.commerce.*
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*
import java.net.URI
import org.springframework.core.env.Environment

@RestController
@RequestMapping("/v1")
class CommerceController(private val customers: CustomerAddressRepository,private val commerce: OrderAndShipmentRepository,private val env: Environment,private val checkout: CheckoutRepository) {
    private fun owner(jwt: Jwt): String = customers.resolve(jwt.issuer.toString(),jwt.subject).id
    @GetMapping("/me") fun me(@AuthenticationPrincipal jwt: Jwt) = Customer(owner(jwt))
    @GetMapping("/me/addresses") fun addresses(@AuthenticationPrincipal jwt: Jwt) = customers.addresses(owner(jwt))
    @PostMapping("/me/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    fun createAddress(@AuthenticationPrincipal jwt: Jwt,@Valid @RequestBody input: AddressInput) = customers.createAddress(owner(jwt),input)
    @PatchMapping("/me/addresses/{id}") fun updateAddress(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String,
        @Valid @RequestBody input: VersionedAddressInput) = customers.updateAddress(owner(jwt),id,input)
    @DeleteMapping("/me/addresses/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteAddress(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String) = customers.deleteAddress(owner(jwt),id)
    @PostMapping("/orders") fun createOrder(@AuthenticationPrincipal jwt: Jwt,
        @RequestHeader("Idempotency-Key") key: String,@Valid @RequestBody input: AcceptQuoteInput): ResponseEntity<OrderView> {
        if(!env.getProperty("CHECKOUT_ENABLED",Boolean::class.java,false)) {
            return ResponseEntity.status(503).build()
        }
        val order=checkout.accept(owner(jwt),key,input.quoteId)
        return ResponseEntity.accepted().location(URI.create("/v1/orders/${order.id}")).body(order)
    }
    @GetMapping("/orders") fun orders(@AuthenticationPrincipal jwt: Jwt) = commerce.orders(owner(jwt))
    @GetMapping("/orders/{id}") fun order(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String) = commerce.order(owner(jwt),id)
    @GetMapping("/orders/{id}/tracking") fun tracking(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String) = commerce.shipments(owner(jwt),id)
    @GetMapping("/me/notifications") fun notifications(@AuthenticationPrincipal jwt: Jwt) = commerce.notifications(owner(jwt))
    @PatchMapping("/me/notifications/{id}/read") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun read(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String) = commerce.readNotification(owner(jwt),id)
}
