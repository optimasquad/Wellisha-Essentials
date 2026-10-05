package com.wellisha.api

import com.wellisha.commerce.*
import jakarta.validation.Valid
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*

@RestController
class BundleController(private val bundles: BundleRepository,private val customers: CustomerAddressRepository,private val jdbc: JdbcClient) {
    private fun authorize(jwt: Jwt) {
        if(jdbc.sql("SELECT count(*) FROM commerce.staff_permission WHERE issuer=:issuer AND subject=:subject AND permission='catalog.bundle.write'")
            .param("issuer",jwt.issuer.toString()).param("subject",jwt.subject).query(Long::class.java).single()==0L) throw AccessDeniedException("Bundle permission required")
    }
    @GetMapping("/v1/admin/products/{id}/bundle") fun view(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String): BundleConfiguration { authorize(jwt);return bundles.configuration(id) }
    @PatchMapping("/v1/admin/products/{id}/bundle") fun update(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String,@Valid @RequestBody input: BundleInput): BundleConfiguration {
        authorize(jwt);return bundles.update(id,customers.resolve(jwt.issuer.toString(),jwt.subject).id,input)
    }
}
