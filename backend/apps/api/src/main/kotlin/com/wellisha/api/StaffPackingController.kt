package com.wellisha.api

import com.wellisha.commerce.*
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*

@RestController
class StaffPackingController(private val packing: PackingRepository,private val customers: CustomerAddressRepository,private val jdbc: JdbcClient) {
    private fun authorize(jwt: Jwt) {
        val count=jdbc.sql("SELECT count(*) FROM commerce.staff_permission WHERE issuer=:issuer AND subject=:subject AND permission='fulfillment.pack.write'")
            .param("issuer",jwt.issuer.toString()).param("subject",jwt.subject).query(Long::class.java).single()
        if(count==0L) throw AccessDeniedException("Packing permission required")
    }
    @PostMapping("/v1/staff/orders/{id}/packages") @ResponseStatus(HttpStatus.CREATED)
    fun create(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String,@RequestHeader("Idempotency-Key") key: String,@Valid @RequestBody input: ParcelInput): ParcelView {
        authorize(jwt);return packing.create(customers.resolve(jwt.issuer.toString(),jwt.subject).id,id,key,input)
    }
    @PostMapping("/v1/staff/packages/{id}/ready") @ResponseStatus(HttpStatus.ACCEPTED)
    fun ready(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String,@Valid @RequestBody input: ReadyParcelInput): ParcelView {
        authorize(jwt);return packing.ready(id,input.version,customers.resolve(jwt.issuer.toString(),jwt.subject).id)
    }
}
