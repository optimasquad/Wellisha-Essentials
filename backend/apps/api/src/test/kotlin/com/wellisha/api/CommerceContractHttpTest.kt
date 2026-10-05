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

@WebMvcTest(CommerceController::class, properties=["CHECKOUT_ENABLED=false"])
@Import(CognitoApiSecurityConfiguration::class, ApiExceptionHandler::class, RequestLoggingFilter::class, RequestBodyLimitFilter::class)
class CommerceContractHttpTest {
    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var mapper: ObjectMapper
    @Autowired lateinit var mappings: RequestMappingHandlerMapping
    @MockitoBean lateinit var customers: CustomerAddressRepository
    @MockitoBean lateinit var commerce: OrderAndShipmentRepository
    @MockitoBean lateinit var decoder: JwtDecoder
    private val contract: JsonNode by lazy {
        mapper.readTree(javaClass.getResourceAsStream("/openapi.json")!!)
    }
    private val now = Instant.parse("2026-10-05T10:00:00Z")
    private val input = AddressInput("Customer", "9999999999", "Road", "Pune", "MH", "411001")
    private val address = Address("a1", input.name, input.phone, input.addressLine, input.city, input.state, input.pincode, 1)

    @Test fun contractCoversExactlyTheImplementedControllerRoutes() {
        val actual = mappings.handlerMethods.filterValues { it.beanType == CommerceController::class.java }
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
        `when`(commerce.products()).thenReturn(listOf(ProductView("p1", "Product", "SKU", 12000, true)))
        `when`(commerce.shipments("alice-id", "o1")).thenReturn(listOf(ShipmentView("s1", "AWAITING_PICKUP", "Amazon Shipping", null, null, now, listOf(TrackingView("AWAITING_PICKUP", now)))))
        `when`(commerce.notifications("alice-id")).thenReturn(listOf(NotificationView("n1", "o1", "Saved update", now, false)))
        checkResponse(get("/v1/me"), "/v1/me", "get", 200)
        checkResponse(get("/v1/me/addresses"), "/v1/me/addresses", "get", 200)
        checkResponse(post("/v1/me/addresses").contentType("application/json").content(mapper.writeValueAsBytes(input)), "/v1/me/addresses", "post", 201)
        checkResponse(patch("/v1/me/addresses/a1").contentType("application/json").content(mapper.writeValueAsBytes(VersionedAddressInput(1, input))), "/v1/me/addresses/{id}", "patch", 200)
        checkResponse(delete("/v1/me/addresses/a1"), "/v1/me/addresses/{id}", "delete", 204)
        checkResponse(get("/v1/products"), "/v1/products", "get", 200, authenticated=false)
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
            .content(mapper.writeValueAsBytes(CreateOrderInput("a1", listOf(OrderLineInput("p1", 1))))), "/v1/orders", "post", 503, empty=true)
        verifyNoInteractions(customers, commerce)
    }

    private fun checkResponse(request: MockHttpServletRequestBuilder, path: String, method: String, status: Int, authenticated: Boolean = true, empty: Boolean = false) {
        if (authenticated) request.with(jwt().jwt { it.subject("alice").claim("iss", "https://cognito-idp.ap-south-1.amazonaws.com/test_pool") })
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
