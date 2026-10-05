package com.wellisha.api

import com.fasterxml.jackson.databind.ObjectMapper
import com.wellisha.commerce.*
import org.flywaydb.core.Flyway
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.util.concurrent.Callable
import java.util.concurrent.Executors

@SpringBootTest(properties=["spring.profiles.active=test","spring.flyway.enabled=false","CHECKOUT_ENABLED=true",
    "COGNITO_ISSUER=https://cognito-idp.ap-south-1.amazonaws.com/test_pool","COGNITO_CLIENT_ID=test-client"])
@AutoConfigureMockMvc
@Testcontainers
class CatalogPricingPostgresTest {
    companion object {
        @Container @JvmField val postgres=PostgreSQLContainer("postgres:17.9")
        @JvmStatic @DynamicPropertySource fun database(registry: DynamicPropertyRegistry) {
            registry.add("DATABASE_JDBC_URL") { postgres.jdbcUrl }
            registry.add("DATABASE_USERNAME") { postgres.username }
            registry.add("DATABASE_PASSWORD") { postgres.password }
        }
    }
    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var mapper: ObjectMapper
    @Autowired lateinit var catalog: CatalogPricingRepository
    @Autowired lateinit var carts: CartRepository
    @Autowired lateinit var customers: CustomerAddressRepository
    @MockitoBean lateinit var decoder: JwtDecoder
    private val issuer="https://cognito-idp.ap-south-1.amazonaws.com/test_pool"
    private fun auth(subject: String="alice",scope: Boolean=false) = jwt().jwt { it.subject(subject).claim("iss",issuer) }
        .authorities(if(scope) listOf(SimpleGrantedAuthority("SCOPE_wellisha/pricing.write")) else emptyList())
    @BeforeEach fun setup() {
        Flyway.configure().dataSource(postgres.jdbcUrl,postgres.username,postgres.password).schemas("commerce").defaultSchema("commerce")
            .cleanDisabled(false).load().also { it.clean(); it.migrate() }
        jdbc.update("INSERT INTO commerce.category(id,name,slug,active) VALUES('period','Period care','period-care',true)")
        jdbc.update("""INSERT INTO commerce.product(id,name,sku,price_minor,stock,active,slug,category_id)
            VALUES('p1','Pads','PAD-1',20000,100,true,'pads','period')""")
    }
    private fun rule(kind: OfferKind,value: Long,buy: Int=1,free: Int=0): OfferInput {
        val at=catalog.databaseTime()
        return OfferInput("Campaign",kind,value,at.minusSeconds(60),at.plusSeconds(600),buy,free)
    }
    private fun price(kind: OfferKind,value: Long,buy: Int=1,free: Int=0) {
        val actor=customers.resolve(issuer,"staff").id
        catalog.updatePricing("p1",actor,PricingInput(0,20000,listOf(rule(kind,value,buy,free)),"Campaign setup"))
    }
    @Test fun publicCatalogSupportsDetailFiltersEffectivePriceSortingAndPages() {
        jdbc.update("INSERT INTO commerce.product(id,name,sku,price_minor,stock,active) VALUES('p2','Other','PAD-2',18000,1,true)")
        price(OfferKind.PERCENTAGE,2500)
        mvc.perform(get("/v1/products").param("sort","price-asc").param("size","1"))
            .andExpect(status().isOk).andExpect(jsonPath("$.items[0].id").value("p1")).andExpect(jsonPath("$.hasMore").value(true))
        mvc.perform(get("/v1/products").param("category","period-care").param("search","Pads"))
            .andExpect(jsonPath("$.items.length()").value(1))
        mvc.perform(get("/v1/products/pads")).andExpect(status().isOk).andExpect(jsonPath("$.product.priceMinor").value(15000))
        mvc.perform(get("/v1/products").param("sort","price;DROP TABLE" )).andExpect(status().isBadRequest)
        mvc.perform(get("/v1/products").param("page","-1")).andExpect(status().isBadRequest)
        mvc.perform(get("/v1/products").param("size","101")).andExpect(status().isBadRequest)
    }
    @Test fun pricingWriteRequiresBothScopeAndServerPermissionAndAuditsOneVersion() {
        val input=PricingInput(0,22000,listOf(rule(OfferKind.FIXED_AMOUNT,2000)),"Seasonal offer")
        val body=mapper.writeValueAsBytes(input)
        mvc.perform(patch("/v1/admin/products/p1/pricing").with(auth()).contentType("application/json").content(body)).andExpect(status().isForbidden)
        mvc.perform(patch("/v1/admin/products/p1/pricing").with(auth(scope=true)).contentType("application/json").content(body)).andExpect(status().isForbidden)
        jdbc.update("INSERT INTO commerce.staff_permission(issuer,subject,permission) VALUES(?,?,'catalog.pricing.write')",issuer,"alice")
        mvc.perform(get("/v1/admin/products/p1/pricing").with(auth(scope=true))).andExpect(status().isOk).andExpect(jsonPath("$.version").value(0))
        mvc.perform(patch("/v1/admin/products/p1/pricing").with(auth(scope=true)).contentType("application/json").content(body))
            .andExpect(status().isOk).andExpect(jsonPath("$.product.priceVersion").value(1)).andExpect(jsonPath("$.product.priceMinor").value(20000))
        mvc.perform(patch("/v1/admin/products/p1/pricing").with(auth(scope=true)).contentType("application/json").content(body)).andExpect(status().isConflict)
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM commerce.pricing_audit",Int::class.java))
        mvc.perform(get("/v1/admin/products/p1/pricing").with(auth(scope=true))).andExpect(status().isOk)
            .andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.offers[0].kind").value("FIXED_AMOUNT"))
    }
    @Test fun concurrentPricingWritesCannotOverwriteTheSameVersion() {
        val actor=customers.resolve(issuer,"staff").id
        val pool=Executors.newFixedThreadPool(2)
        try {
            val results=pool.invokeAll(listOf(21000L,22000L).map { price -> Callable { runCatching { catalog.updatePricing("p1",actor,PricingInput(0,price,emptyList(),"Change")) }.isSuccess } }).map { it.get() }
            assertEquals(1,results.count { it })
            assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM commerce.pricing_audit",Int::class.java))
        } finally { pool.shutdownNow() }
    }
    @Test fun cartIsOwnedBoundedAndRepricedWithoutClientAmounts() {
        mvc.perform(post("/v1/cart/items").with(auth()).contentType("application/json").content("""{"productId":"p1","quantity":3}"""))
            .andExpect(status().isNoContent)
        val alice=customers.resolve(issuer,"alice").id
        val item=carts.view(alice).items.single()
        mvc.perform(patch("/v1/cart/items/${item.id}").with(auth("bob")).contentType("application/json").content("""{"quantity":2}"""))
            .andExpect(status().isNotFound)
        mvc.perform(delete("/v1/cart/items/${item.id}").with(auth("bob"))).andExpect(status().isNotFound)
        mvc.perform(post("/v1/cart/items").with(auth()).contentType("application/json").content("""{"productId":"p1","quantity":1,"priceMinor":1}"""))
            .andExpect(status().isBadRequest)
        mvc.perform(patch("/v1/cart/items/${item.id}").with(auth()).contentType("application/json").content("""{"quantity":101}"""))
            .andExpect(status().isBadRequest)
        price(OfferKind.BUNDLE_PRICE,49900,3)
        mvc.perform(get("/v1/cart").with(auth())).andExpect(status().isOk).andExpect(jsonPath("$.subtotalMinor").value(49900)).andExpect(jsonPath("$.savingsMinor").value(10100))
        mvc.perform(get("/v1/cart").with(auth("bob"))).andExpect(jsonPath("$.items.length()").value(0))
    }
    @Test fun freeUnitsAndScheduledExpiryAreCalculatedOnEachCartRead() {
        val alice=customers.resolve(issuer,"alice").id
        carts.add(alice,CartItemInput("p1",3))
        price(OfferKind.BUY_X_GET_Y,0,2,1)
        assertEquals(40000L,carts.view(alice).subtotalMinor)
        jdbc.update("UPDATE commerce.product_offer SET ends_at=now()-interval '1 second'")
        assertEquals(60000L,carts.view(alice).subtotalMinor)
        assertNull(catalog.detail("pads").product.offerTitle)
    }
    @Test fun scheduledOffersStartWithoutARepublishAndAdviseEarlyRefresh() {
        val actor=customers.resolve(issuer,"staff").id
        val at=catalog.databaseTime()
        catalog.updatePricing("p1",actor,PricingInput(0,20000,listOf(rule(OfferKind.PERCENTAGE,1500).copy(startsAt=at.plusSeconds(5))),"Scheduled"))
        val before=catalog.detail("pads")
        assertEquals(20000L,before.product.priceMinor)
        assertTrue(before.refreshAfterMs in 1000..5000)
        jdbc.update("UPDATE commerce.product_offer SET starts_at=now()-interval '1 second'")
        assertEquals(17000L,catalog.detail("pads").product.priceMinor)
    }
    @Test fun invalidOverlappingRulesDoNotPartiallyUpdatePriceOrAudit() {
        val actor=customers.resolve(issuer,"staff").id
        val offer=rule(OfferKind.PERCENTAGE,1500)
        assertThrows(IllegalArgumentException::class.java) { catalog.updatePricing("p1",actor,PricingInput(0,10000,listOf(offer,offer),"Invalid")) }
        assertEquals(0L,catalog.detail("pads").product.priceVersion)
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM commerce.pricing_audit",Int::class.java))
    }
    @Test fun orderUsesTheSameBundleRuleAndPreservesItsPricingSnapshot() {
        price(OfferKind.BUNDLE_PRICE,49900,3)
        val alice=customers.resolve(issuer,"alice").id
        val address=customers.createAddress(alice,AddressInput("Customer","9999999999","Road","Pune","MH","411001"))
        val quote=mvc.perform(post("/v1/checkout/quotes").with(auth()).contentType("application/json")
            .content(mapper.writeValueAsBytes(CreateOrderInput(address.id,listOf(OrderLineInput("p1",3)))))).andExpect(status().isCreated).andReturn()
        val body=mapper.writeValueAsBytes(AcceptQuoteInput(mapper.readTree(quote.response.contentAsString)["id"].asText()))
        val result=mvc.perform(post("/v1/orders").with(auth()).header("Idempotency-Key","bundle-order-test-01").contentType("application/json").content(body))
            .andExpect(status().isAccepted).andExpect(jsonPath("$.totalMinor").value(49900+4900)).andReturn()
        val id=mapper.readTree(result.response.contentAsString)["id"].asText()
        val staff=customers.resolve(issuer,"staff").id
        catalog.updatePricing("p1",staff,PricingInput(1,30000,emptyList(),"Next price"))
        assertEquals(49900L,jdbc.queryForObject("SELECT total_minor FROM commerce.order_line WHERE order_id=?",Long::class.java,id))
        assertEquals(10100L,jdbc.queryForObject("SELECT discount_minor FROM commerce.order_line WHERE order_id=?",Long::class.java,id))
    }
    @Test fun inactiveOrInsufficientStockLinesStayVisibleButCannotBeIncreased() {
        val alice=customers.resolve(issuer,"alice").id
        carts.add(alice,CartItemInput("p1",2))
        jdbc.update("UPDATE commerce.product SET stock=1,active=false WHERE id='p1'")
        val cart=carts.view(alice)
        assertFalse(cart.items.single().purchasable)
        assertFalse(cart.items.single().product.available)
        assertThrows(StateConflict::class.java) { carts.update(alice,cart.items.single().id,CartQuantityInput(3)) }
        carts.delete(alice,cart.items.single().id)
        assertTrue(carts.view(alice).items.isEmpty())
    }
}
