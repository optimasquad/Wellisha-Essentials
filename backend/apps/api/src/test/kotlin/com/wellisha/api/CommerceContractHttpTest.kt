package com.wellisha.api

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.wellisha.commerce.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping
import java.time.Instant

@WebMvcTest(CommerceController::class, CatalogCartController::class, CheckoutController::class, PaymentController::class, StaffRefundController::class, StaffPackingController::class, NotificationPreferenceController::class, ShipmentDocumentController::class, StaffOperationsController::class, BundleController::class, properties=["CHECKOUT_ENABLED=false"])
@Import(CognitoApiSecurityConfiguration::class, ApiExceptionHandler::class, RequestLoggingFilter::class, RequestBodyLimitFilter::class)
class CommerceContractHttpTest {
    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var mapper: ObjectMapper
    @Autowired lateinit var mappings: RequestMappingHandlerMapping
    @MockitoBean lateinit var customers: CustomerAddressRepository
    @MockitoBean lateinit var commerce: OrderAndShipmentRepository
    @MockitoBean lateinit var catalog: CatalogPricingRepository
    @MockitoBean lateinit var carts: CartRepository
    @MockitoBean lateinit var checkout: CheckoutRepository
    @MockitoBean lateinit var payments: PaymentRepository
    @MockitoBean lateinit var secrets: ProviderSecrets
    @MockitoBean lateinit var refunds: RefundRepository
    @MockitoBean lateinit var packing: PackingRepository
    @MockitoBean lateinit var bundles: BundleRepository
    @MockitoBean lateinit var notifications: NotificationRepository
    @MockitoBean lateinit var contacts: CognitoContactLookup
    @MockitoBean lateinit var shipping: ShippingRepository
    @MockitoBean lateinit var jdbc: org.springframework.jdbc.core.simple.JdbcClient
    @MockitoBean lateinit var decoder: JwtDecoder
    private val contract: JsonNode by lazy {
        mapper.readTree(javaClass.getResourceAsStream("/openapi.json")!!)
    }
    private val now = Instant.parse("2026-10-05T10:00:00Z")
    private val input = AddressInput("Customer", "9999999999", "Road", "Pune", "MH", "411001")
    private val address = Address("a1", input.name, input.phone, input.addressLine, input.city, input.state, input.pincode, 1)

    @Test fun contractCoversExactlyTheImplementedControllerRoutes() {
        val actual = mappings.handlerMethods.filterValues { it.beanType in setOf(CommerceController::class.java,CatalogCartController::class.java,CheckoutController::class.java,PaymentController::class.java,StaffRefundController::class.java,StaffPackingController::class.java,NotificationPreferenceController::class.java,ShipmentDocumentController::class.java,StaffOperationsController::class.java,BundleController::class.java) }
            .flatMap { (mapping, _) -> mapping.patternValues.flatMap { path -> mapping.methodsCondition.methods.map { "${it.name.lowercase()} $path" } } }.toSet()
        val declared = contract["paths"].fields().asSequence().flatMap { (path, methods) -> methods.fieldNames().asSequence().map { "$it $path" } }.toSet()
        assertEquals(actual, declared)
    }

    @Test fun successfulHttpResponsesMatchTheContractIncludingNullTracking() {
        `when`(customers.resolve("https://cognito-idp.ap-south-1.amazonaws.com/test_pool", "alice")).thenReturn(Customer("alice-id"))
        `when`(customers.addresses("alice-id")).thenReturn(listOf(address))
        `when`(customers.createAddress("alice-id", input)).thenReturn(address)
        `when`(customers.updateAddress("alice-id", "a1", VersionedAddressInput(1, input))).thenReturn(address.copy(version=2))
        val order = OrderView("o1", 12000, "INR", "PAYMENT_SETUP_PENDING", "AWAITING_PAYMENT", now)
        `when`(commerce.orders("alice-id")).thenReturn(listOf(order))
        `when`(commerce.order("alice-id", "o1")).thenReturn(order)
        `when`(catalog.products(0,24,null,null,"latest")).thenReturn(CatalogPage(listOf(ProductView("p1", "Product", "SKU", 12000, true)),0,false,now,15000))
        `when`(catalog.categories()).thenReturn(listOf(CategoryView("cat","Period care","period-care")))
        `when`(catalog.detail("pads")).thenReturn(ProductDetailView(ProductView("p1","Product","SKU",12000,true),now,15000))
        `when`(carts.view("alice-id")).thenReturn(CartView(emptyList(),0,0,"INR",now,15000))
        `when`(catalog.mayPrice("https://cognito-idp.ap-south-1.amazonaws.com/test_pool","alice")).thenReturn(true)
        `when`(catalog.configuration("p1")).thenReturn(PricingConfiguration(0,12000,emptyList()))
        val pricingInput=PricingInput(0,12000,emptyList(),"Approved update")
        `when`(catalog.updatePricing("p1","alice-id",pricingInput)).thenReturn(ProductDetailView(ProductView("p1","Product","SKU",12000,true),now,15000))
        `when`(commerce.shipments("alice-id", "o1")).thenReturn(listOf(ShipmentView("s1", "AWAITING_PICKUP", "Amazon Shipping", null, null, now, listOf(TrackingView("AWAITING_PICKUP", now)))))
        `when`(commerce.notifications("alice-id")).thenReturn(listOf(NotificationView("n1", "o1", "Saved update", now, false)))
        checkResponse(get("/v1/me"), "/v1/me", "get", 200)
        checkResponse(get("/v1/me/addresses"), "/v1/me/addresses", "get", 200)
        checkResponse(post("/v1/me/addresses").contentType("application/json").content(mapper.writeValueAsBytes(input)), "/v1/me/addresses", "post", 201)
        checkResponse(patch("/v1/me/addresses/a1").contentType("application/json").content(mapper.writeValueAsBytes(VersionedAddressInput(1, input))), "/v1/me/addresses/{id}", "patch", 200)
        checkResponse(delete("/v1/me/addresses/a1"), "/v1/me/addresses/{id}", "delete", 204)
        checkResponse(get("/v1/products"), "/v1/products", "get", 200, authenticated=false)
        checkResponse(get("/v1/categories"), "/v1/categories", "get", 200, authenticated=false)
        checkResponse(get("/v1/products/pads"), "/v1/products/{slug}", "get", 200, authenticated=false)
        checkResponse(get("/v1/cart"), "/v1/cart", "get", 200)
        checkResponse(post("/v1/cart/items").contentType("application/json").content("""{"productId":"p1","quantity":1}"""), "/v1/cart/items", "post", 204)
        checkResponse(patch("/v1/cart/items/c1").contentType("application/json").content("""{"quantity":1}"""), "/v1/cart/items/{id}", "patch", 204)
        checkResponse(delete("/v1/cart/items/c1"), "/v1/cart/items/{id}", "delete", 204)
        checkResponse(get("/v1/admin/products/p1/pricing"), "/v1/admin/products/{id}/pricing", "get", 200, pricingScope=true)
        checkResponse(patch("/v1/admin/products/p1/pricing").contentType("application/json").content(mapper.writeValueAsBytes(pricingInput)), "/v1/admin/products/{id}/pricing", "patch", 200, pricingScope=true)
        checkResponse(get("/v1/orders"), "/v1/orders", "get", 200)
        checkResponse(get("/v1/orders/o1"), "/v1/orders/{id}", "get", 200)
        checkResponse(get("/v1/orders/o1/tracking"), "/v1/orders/{id}/tracking", "get", 200)
        checkResponse(get("/v1/me/notifications"), "/v1/me/notifications", "get", 200)
        checkResponse(patch("/v1/me/notifications/n1/read"), "/v1/me/notifications/{id}/read", "patch", 204)
    }

    @Test fun errorsAndDisabledCheckoutMatchTheirDocumentedResponseShapes() {
        checkResponse(get("/v1/me"), "/v1/me", "get", 401, authenticated=false)
        checkResponse(post("/v1/me/addresses").contentType("application/json").content("{}"), "/v1/me/addresses", "post", 400)
        checkResponse(post("/v1/orders").header("Idempotency-Key", "test-order-request-01").contentType("application/json")
            .content(mapper.writeValueAsBytes(AcceptQuoteInput("q1"))), "/v1/orders", "post", 503, empty=true)
        verifyNoInteractions(customers, commerce)
    }

    private fun checkResponse(request: MockHttpServletRequestBuilder, path: String, method: String, status: Int, authenticated: Boolean = true, empty: Boolean = false, pricingScope: Boolean=false) {
        if (authenticated) request.with(jwt().jwt { it.subject("alice").claim("iss", "https://cognito-idp.ap-south-1.amazonaws.com/test_pool"); if(pricingScope)it.claim("scope","wellisha/pricing.write") })
        val response = mvc.perform(request).andReturn().response
        assertEquals(status, response.status, "$method $path")
        assertEquals("no-store", response.getHeader("Cache-Control"))
        assertNotNull(response.getHeader("X-Correlation-ID"))
        var documented = contract["paths"][path][method]["responses"][status.toString()]
        if (documented.has("\$ref")) documented = contract.at(documented["\$ref"].asText().removePrefix("#"))
        if (status == 204 || empty) assertEquals("", response.contentAsString)
        else if (documented.has("content")) assertSchema(mapper.readTree(response.contentAsString), documented["content"]["application/json"]["schema"])
    }

    // Checks this contract's wire subset against real MVC serialization. Not a general OpenAPI validator.
    private fun assertSchema(value: JsonNode, original: JsonNode) {
        val schema = if (original.has("\$ref")) contract.at(original["\$ref"].asText().removePrefix("#")) else original
        if (value.isNull) { assertTrue(schema.path("nullable").asBoolean(), "Unexpected null: $schema"); return }
        when (schema["type"].asText()) {
            "object" -> {
                assertTrue(value.isObject)
                schema["required"].forEach { assertTrue(value.has(it.asText()), "Missing ${it.asText()}") }
                // DTOs must not leak fields absent from the public schema.
                assertEquals(schema["properties"].fieldNames().asSequence().toSet(), value.fieldNames().asSequence().toSet())
                value.fields().forEach { (name, field) -> assertSchema(field, schema["properties"][name]) }
            }
            "array" -> { assertTrue(value.isArray); value.forEach { assertSchema(it, schema["items"]) } }
            "string" -> { assertTrue(value.isTextual); if (schema.path("format").asText() == "date-time") Instant.parse(value.asText()) }
            "integer" -> assertTrue(value.isIntegralNumber)
            "boolean" -> assertTrue(value.isBoolean)
            else -> fail<Unit>("Unsupported contract type: $schema")
        }
    }
}
