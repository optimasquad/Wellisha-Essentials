package com.wellisha.api

import com.wellisha.commerce.*
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/v1/checkout/quotes")
class CheckoutController(private val customers: CustomerAddressRepository,private val checkout: CheckoutRepository) {
    private fun owner(jwt: Jwt)=customers.resolve(jwt.issuer.toString(),jwt.subject).id
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    fun quote(@AuthenticationPrincipal jwt: Jwt,@Valid @RequestBody input: CreateOrderInput)=checkout.quote(owner(jwt),input)
    @GetMapping("/{id}") fun view(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String)=checkout.view(owner(jwt),id)
}
