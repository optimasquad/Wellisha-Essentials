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
class StaffRefundController(private val refunds: RefundRepository,private val customers: CustomerAddressRepository,private val jdbc: JdbcClient) {
    @PostMapping("/v1/staff/orders/{id}/refunds") @ResponseStatus(HttpStatus.ACCEPTED)
    fun refund(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String,@RequestHeader("Idempotency-Key") key: String,@Valid @RequestBody input: RefundInput): RefundView {
        val allowed=jdbc.sql("SELECT count(*) FROM commerce.staff_permission WHERE issuer=:issuer AND subject=:subject AND permission='orders.refund.write'")
            .param("issuer",jwt.issuer.toString()).param("subject",jwt.subject).query(Long::class.java).single()>0
        if(!allowed) throw AccessDeniedException("Refund permission required")
        return refunds.request(customers.resolve(jwt.issuer.toString(),jwt.subject).id,id,key,input)
    }
}
