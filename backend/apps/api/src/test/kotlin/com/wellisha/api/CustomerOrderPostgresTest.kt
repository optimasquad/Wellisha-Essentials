package com.wellisha.api

import org.junit.jupiter.api.*
import org.junit.jupiter.api.Assertions.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.web.servlet.MockMvc
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.jdbc.core.JdbcTemplate
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.*
import org.flywaydb.core.Flyway
import com.fasterxml.jackson.databind.ObjectMapper
import java.util.concurrent.Executors
import java.util.concurrent.Callable
import com.wellisha.commerce.*

@SpringBootTest(properties=[
    "spring.profiles.active=test",
    "spring.flyway.enabled=false", // The isolated schema is initialized explicitly before each test.
    "COGNITO_ISSUER=https://cognito-idp.ap-south-1.amazonaws.com/test_pool",
    "COGNITO_CLIENT_ID=test-client",
    "CHECKOUT_ENABLED=true"
])
@AutoConfigureMockMvc
@Testcontainers
class CustomerOrderPostgresTest {
    companion object {
        @Container @JvmField val postgres=PostgreSQLContainer("postgres:17.9")
        @JvmStatic @DynamicPropertySource
        fun database(registry: DynamicPropertyRegistry) {
            registry.add("DATABASE_JDBC_URL") { postgres.jdbcUrl }
            registry.add("DATABASE_USERNAME") { postgres.username }
            registry.add("DATABASE_PASSWORD") { postgres.password }
        }
    }
    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var mapper: ObjectMapper
    @Autowired lateinit var orders: OrderAndShipmentRepository
    @Autowired lateinit var customers: CustomerAddressRepository
    @Autowired lateinit var checkout: CheckoutRepository
    @MockitoBean lateinit var decoder: JwtDecoder

    @BeforeEach fun freshSchema() {
        Flyway.configure().dataSource(postgres.jdbcUrl,postgres.username,postgres.password)
            .schemas("commerce").defaultSchema("commerce").cleanDisabled(false).load().also { it.clean();it.migrate() }
    }
    private fun auth(subject:String="alice") = jwt().jwt {
        it.subject(subject).claim("iss","https://cognito-idp.ap-south-1.amazonaws.com/test_pool")
            .claim("token_use","access").claim("client_id","test-client")
    }
    private fun address(subject:String="alice",name:String="Wellisha Customer"): String {
        val body=mapper.writeValueAsString(AddressInput(name,"9999999999","Store Road","Mumbai","MH","400001"))
        val result=mvc.perform(post("/v1/me/addresses").with(auth(subject)).contentType("application/json").content(body))
            .andExpect(status().isCreated).andReturn()
        return mapper.readTree(result.response.contentAsString).get("id").asText()
    }
    @Test fun requiresAuthentication() { mvc.perform(get("/v1/me")).andExpect(status().isUnauthorized) }
    @Test fun nullAndMissingInputsAreRejected() {
        mvc.perform(post("/v1/me/addresses").with(auth()).contentType("application/json").content("""{"name":null}"""))
            .andExpect(status().isBadRequest)
    }
    @Test fun ownershipAndSqlInjectionAreEnforced() {
        val payload="O'Brien'; DROP TABLE commerce.customer; --"
        val id=address(name=payload)
        mvc.perform(get("/v1/me/addresses").with(auth())).andExpect(status().isOk)
            .andExpect(jsonPath("$[0].name").value(payload))
        mvc.perform(get("/v1/me/addresses").with(auth("bob"))).andExpect(jsonPath("$.length()").value(0))
        mvc.perform(delete("/v1/me/addresses/$id").with(auth("bob"))).andExpect(status().isNotFound)
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM commerce.customer",Int::class.java))
    }
    @Test fun optimisticAddressUpdatesCannotOverwriteAnotherVersion() {
        val id=address()
        val body=mapper.writeValueAsString(VersionedAddressInput(0,AddressInput("New name","9999999999","Road","Mumbai","MH","400001")))
        mvc.perform(patch("/v1/me/addresses/$id").with(auth()).contentType("application/json").content(body))
            .andExpect(status().isOk)
        mvc.perform(patch("/v1/me/addresses/$id").with(auth()).contentType("application/json").content(body))
            .andExpect(status().isNotFound)
    }
    @Test fun orderIsDurableIdempotentAndPrivate() {
        val id=address()
        jdbc.update("INSERT INTO commerce.product(id,name,sku,price_minor,stock,active) VALUES(?,?,?,?,?,?)",
            "p1","Pads","sku1",19900,2,true)
        val owner=customers.resolve("https://cognito-idp.ap-south-1.amazonaws.com/test_pool","alice").id
        val quote=checkout.quote(owner,CreateOrderInput(id,listOf(OrderLineInput("p1",1))))
        val input=mapper.writeValueAsString(AcceptQuoteInput(quote.id))
        val first=mvc.perform(post("/v1/orders").with(auth()).header("Idempotency-Key","checkout-request-0001")
            .contentType("application/json").content(input)).andExpect(status().isAccepted).andReturn()
        val orderId=mapper.readTree(first.response.contentAsString).get("id").asText()
        mvc.perform(post("/v1/orders").with(auth()).header("Idempotency-Key","checkout-request-0001")
            .contentType("application/json").content(input)).andExpect(status().isAccepted).andExpect(jsonPath("$.id").value(orderId))
        mvc.perform(get("/v1/orders/$orderId").with(auth("bob"))).andExpect(status().isNotFound)
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM commerce.outbox",Int::class.java))
        assertEquals(1,jdbc.queryForObject("SELECT stock FROM commerce.product WHERE id='p1'",Int::class.java))
    }
    @Test fun changedPayloadCannotReuseIdempotencyKey() {
        val id=address()
        jdbc.update("INSERT INTO commerce.product(id,name,sku,price_minor,stock,active) VALUES(?,?,?,?,?,?)",
            "p1","Pads","sku1",19900,3,true)
        for(quantity in listOf(1,2)) {
            val owner=customers.resolve("https://cognito-idp.ap-south-1.amazonaws.com/test_pool","alice").id
            val quote=checkout.quote(owner,CreateOrderInput(id,listOf(OrderLineInput("p1",quantity))))
            val input=mapper.writeValueAsString(AcceptQuoteInput(quote.id))
            mvc.perform(post("/v1/orders").with(auth()).header("Idempotency-Key","checkout-request-0001")
                .contentType("application/json").content(input)).andExpect(if(quantity==1) status().isAccepted else status().isConflict)
        }
    }
    @Test fun stockCannotBeOversoldUnderConcurrency() {
        val alice=customers.resolve("issuer","alice").id
        val bob=customers.resolve("issuer","bob").id
        val input=AddressInput("Name","9999999999","Road","Mumbai","MH","400001")
        val aa=customers.createAddress(alice,input).id
        val bb=customers.createAddress(bob,input).id
        jdbc.update("INSERT INTO commerce.product(id,name,sku,price_minor,stock,active) VALUES(?,?,?,?,?,?)",
            "p1","Pads","sku1",19900,1,true)
        val pool=Executors.newFixedThreadPool(2)
        try {
            val outcomes=pool.invokeAll(listOf(
                Callable { runCatching { orders.createOrder(alice,"concurrent-request-01",CreateOrderInput(aa,listOf(OrderLineInput("p1",1)))) }.isSuccess },
                Callable { runCatching { orders.createOrder(bob,"concurrent-request-02",CreateOrderInput(bb,listOf(OrderLineInput("p1",1)))) }.isSuccess }
            )).map { it.get() }
            assertEquals(1,outcomes.count { it })
            assertEquals(0,jdbc.queryForObject("SELECT stock FROM commerce.product WHERE id='p1'",Int::class.java))
            assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM commerce.orders",Int::class.java))
        } finally { pool.shutdownNow() }
    }
    @Test fun customerCannotUseStaffEndpoint() {
        mvc.perform(post("/v1/staff/packages/p1/ready").with(auth())).andExpect(status().isForbidden)
    }
    @Test fun noSensitiveDetailsInErrorsAndCorrelationPresent() {
        mvc.perform(get("/v1/orders/missing").with(auth())).andExpect(status().isNotFound)
            .andExpect(header().exists("X-Correlation-ID")).andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
            .andExpect(jsonPath("$.stackTrace").doesNotExist())
    }
}
