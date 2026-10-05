package com.wellisha.api

import com.wellisha.commerce.*
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/v1")
class CatalogCartController(private val catalog: CatalogPricingRepository,private val carts: CartRepository,private val customers: CustomerAddressRepository) {
    private fun owner(jwt: Jwt) = customers.resolve(jwt.issuer.toString(),jwt.subject).id
    @GetMapping("/categories") fun categories() = catalog.categories()
    @GetMapping("/products") fun products(
        @RequestParam(defaultValue="0") page: Int,
        @RequestParam(defaultValue="24") size: Int,
        @RequestParam(required=false) category: String?,
        @RequestParam(required=false) search: String?,
        @RequestParam(defaultValue="latest") sort: String
    ) = catalog.products(page,size,category,search,sort)
    @GetMapping("/products/{slug}") fun product(@PathVariable slug: String) = catalog.detail(slug)
    @GetMapping("/admin/products/{id}/pricing") fun configuration(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String): PricingConfiguration {
        if(!catalog.mayPrice(jwt.issuer.toString(),jwt.subject)) throw AccessDeniedException("Pricing permission required")
        return catalog.configuration(id)
    }
    @PatchMapping("/admin/products/{id}/pricing") fun pricing(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String,@Valid @RequestBody input: PricingInput): ProductDetailView {
        if(!catalog.mayPrice(jwt.issuer.toString(),jwt.subject)) throw AccessDeniedException("Pricing permission required")
        return catalog.updatePricing(id,owner(jwt),input)
    }
    @GetMapping("/cart") fun cart(@AuthenticationPrincipal jwt: Jwt) = carts.view(owner(jwt))
    @PostMapping("/cart/items") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun add(@AuthenticationPrincipal jwt: Jwt,@Valid @RequestBody input: CartItemInput) { carts.add(owner(jwt),input) }
    @PatchMapping("/cart/items/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun update(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String,@Valid @RequestBody input: CartQuantityInput) { carts.update(owner(jwt),id,input) }
    @DeleteMapping("/cart/items/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String) { carts.delete(owner(jwt),id) }
}
