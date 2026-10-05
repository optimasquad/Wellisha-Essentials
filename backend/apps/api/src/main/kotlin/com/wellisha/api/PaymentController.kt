package com.wellisha.api

import com.wellisha.commerce.*
import org.springframework.http.HttpStatus
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*

@RestController
class PaymentController(private val payments: PaymentRepository,private val customers: CustomerAddressRepository,private val secrets: ProviderSecrets) {
    @GetMapping("/v1/orders/{id}/payment")
    fun checkout(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String)=payments.checkout(customers.resolve(jwt.issuer.toString(),jwt.subject).id,id)
    @PostMapping("/v1/webhooks/razorpay",consumes=["application/json"]) @ResponseStatus(HttpStatus.NO_CONTENT)
    fun webhook(@RequestHeader("X-Razorpay-Event-Id") event: String,@RequestHeader("X-Razorpay-Signature") signature: String,@RequestBody body: ByteArray) {
        val secret=secrets.read("RAZORPAY")
        val valid=sequenceOf("webhookSecret","previousWebhookSecret").mapNotNull { secret.get(it)?.asText() }
            .any { WebhookSignatures.valid(body,signature,it) }
        if(!valid) throw AccessDeniedException("Invalid webhook signature")
        payments.ingest(event,body)
    }
}
