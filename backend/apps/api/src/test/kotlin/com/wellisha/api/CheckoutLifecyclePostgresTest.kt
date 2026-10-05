package com.wellisha.api

import com.wellisha.commerce.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Assertions.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.web.servlet.MockMvc
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
import java.util.concurrent.Callable
import java.util.concurrent.Executors

@SpringBootTest(properties=["spring.profiles.active=test","spring.flyway.enabled=false","CHECKOUT_ENABLED=true",
    "COGNITO_ISSUER=https://cognito-idp.ap-south-1.amazonaws.com/test_pool","COGNITO_CLIENT_ID=test-client",
    "RAZORPAY_TEST_SECRET_JSON={\"webhookSecret\":\"fixture-webhook-secret\",\"accountId\":\"acc_fixture\"}"])
@AutoConfigureMockMvc @Testcontainers
class CheckoutLifecyclePostgresTest {
    companion object {
        @Container @JvmField val postgres=PostgreSQLContainer("postgres:17.9")
        @JvmStatic @DynamicPropertySource fun database(r: DynamicPropertyRegistry) {
            r.add("DATABASE_JDBC_URL") { postgres.jdbcUrl };r.add("DATABASE_USERNAME") { postgres.username };r.add("DATABASE_PASSWORD") { postgres.password }
        }
    }
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var customers: CustomerAddressRepository
    @Autowired lateinit var checkout: CheckoutRepository
    @Autowired lateinit var payments: PaymentRepository
    @Autowired lateinit var reservations: ReservationRepository
    @Autowired lateinit var refunds: RefundRepository
    @Autowired lateinit var packing: PackingRepository
    @Autowired lateinit var shipping: ShippingRepository
    @Autowired lateinit var notifications: NotificationRepository
    @Autowired lateinit var bundles: BundleRepository
    @Autowired lateinit var catalog: CatalogPricingRepository
    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var mapper: ObjectMapper
    @MockitoBean lateinit var decoder: JwtDecoder
    private lateinit var owner: String
    private lateinit var input: CreateOrderInput
    @BeforeEach fun fresh() {
        Flyway.configure().dataSource(postgres.jdbcUrl,postgres.username,postgres.password).schemas("commerce").defaultSchema("commerce").cleanDisabled(false).load().also { it.clean();it.migrate() }
        owner=customers.resolve("https://cognito-idp.ap-south-1.amazonaws.com/test_pool","alice").id
        val address=customers.createAddress(owner,AddressInput("Customer","9999999999","Road","Mumbai","MH","400001"))
        jdbc.update("INSERT INTO commerce.product(id,name,sku,price_minor,stock,active) VALUES('p1','Pads','SKU',20000,10,true)")
        input=CreateOrderInput(address.id,listOf(OrderLineInput("p1",3)))
    }
    private fun order(): OrderView { val q=checkout.quote(owner,input);return checkout.accept(owner,"checkout-key-0001",q.id) }
    private fun ready(o: OrderView) { payments.begin(o.id);payments.ready(o.id,"order_fixture","rzp_test_fixture") }
    @Test fun quoteIsOwnedAndAcceptanceCannotSilentlyReprice() {
        val quote=checkout.quote(owner,input)
        val other=customers.resolve("issuer","bob").id
        assertThrows(MissingResource::class.java) { checkout.view(other,quote.id) }
        jdbc.update("UPDATE commerce.product SET price_minor=21000,price_version=1")
        assertThrows(StateConflict::class.java) { checkout.accept(owner,"checkout-key-0001",quote.id) }
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM commerce.orders",Int::class.java))
        assertEquals(10,jdbc.queryForObject("SELECT stock FROM commerce.product",Int::class.java))
    }
    @Test fun expiredQuoteAndChangedAddressRequireNewConfirmation() {
        val quote=checkout.quote(owner,input)
        jdbc.update("UPDATE commerce.checkout_quote SET expires_at=created_at+interval '1 millisecond',created_at=created_at-interval '1 hour'")
        assertThrows(StateConflict::class.java) { checkout.accept(owner,"checkout-key-0001",quote.id) }
        val newer=checkout.quote(owner,input)
        jdbc.update("UPDATE commerce.address SET version=version+1")
        assertThrows(StateConflict::class.java) { checkout.accept(owner,"checkout-key-0001",newer.id) }
    }
    @Test fun oneQuoteCreatesOneDurableOrderUnderConcurrentAcceptance() {
        val quote=checkout.quote(owner,input)
        val pool=Executors.newFixedThreadPool(2)
        try {
            val results=pool.invokeAll((1..2).map { Callable { checkout.accept(owner,"checkout-key-0001",quote.id).id } }).map { it.get() }
            assertEquals(1,results.distinct().size)
            assertEquals(7,jdbc.queryForObject("SELECT stock FROM commerce.product",Int::class.java))
            assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM commerce.stock_reservation",Int::class.java))
        } finally { pool.shutdownNow() }
    }
    @Test fun expiryReleasesExactlyOnceAndDoesNotReleaseUncertainProviderCalls() {
        val o=order()
        jdbc.update("UPDATE commerce.stock_reservation SET expires_at=now()-interval '1 second'")
        assertEquals(1,reservations.expireBatch());assertEquals(0,reservations.expireBatch())
        assertEquals(10,jdbc.queryForObject("SELECT stock FROM commerce.product",Int::class.java))
        assertNull(payments.begin(o.id))
    }
    @Test fun uncertainSetupCannotRepeatItsProviderPostOrReleaseStock() {
        val o=order();assertNotNull(payments.begin(o.id));payments.unknown(o.id)
        assertNull(payments.begin(o.id))
        jdbc.update("UPDATE commerce.stock_reservation SET expires_at=now()-interval '1 second'")
        assertEquals(0,reservations.expireBatch())
        assertEquals(7,jdbc.queryForObject("SELECT stock FROM commerce.product",Int::class.java))
    }
    @Test fun verifiedCaptureIsBoundedAndIdempotentAndCreatesPacking() {
        val o=order();ready(o)
        assertThrows(StateConflict::class.java) { payments.capture("order_fixture","pay_fixture",o.totalMinor-1,"INR") }
        assertTrue(payments.capture("order_fixture","pay_fixture",o.totalMinor,"INR"))
        assertFalse(payments.capture("order_fixture","pay_fixture",o.totalMinor,"INR"))
        assertThrows(StateConflict::class.java) { payments.capture("order_fixture","pay_other",o.totalMinor,"INR") }
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM commerce.packing_task",Int::class.java))
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM commerce.notification",Int::class.java))
        jdbc.update("UPDATE commerce.stock_reservation SET expires_at=now()-interval '1 second'")
        assertEquals(0,reservations.expireBatch())
    }
    @Test fun lateCaptureNeverCreatesPackingAndReleasesRemainingReservation() {
        val o=order();ready(o)
        jdbc.update("UPDATE commerce.stock_reservation SET expires_at=now()-interval '1 second'")
        payments.capture("order_fixture","pay_fixture",o.totalMinor,"INR")
        assertEquals("PAID_LATE_REVIEW",jdbc.queryForObject("SELECT payment_state FROM commerce.orders",String::class.java))
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM commerce.packing_task",Int::class.java))
        assertEquals(10,jdbc.queryForObject("SELECT stock FROM commerce.product",Int::class.java))
    }
    @Test fun webhookRejectsForgeryAndStoresDuplicatesOnce() {
        val body="""{"event":"payment.captured","account_id":"acc_fixture","payload":{}}""".toByteArray()
        mvc.perform(post("/v1/webhooks/razorpay").header("X-Razorpay-Event-Id","evt_fixture").header("X-Razorpay-Signature","0".repeat(64)).contentType("application/json").content(body)).andExpect(status().isForbidden)
        val mac=javax.crypto.Mac.getInstance("HmacSHA256");mac.init(javax.crypto.spec.SecretKeySpec("fixture-webhook-secret".toByteArray(),"HmacSHA256"))
        val signature=mac.doFinal(body).joinToString("") { "%02x".format(it) }
        repeat(2) { mvc.perform(post("/v1/webhooks/razorpay").header("X-Razorpay-Event-Id","evt_fixture").header("X-Razorpay-Signature",signature).contentType("application/json").content(body)).andExpect(status().isNoContent) }
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM commerce.inbox",Int::class.java))
        assertThrows(StateConflict::class.java) { payments.ingest("evt_fixture","""{"event":"different"}""".toByteArray()) }
    }
    @Test fun refundMoneyIncludesUnknownReservationsAndCannotExceedCapturedAmount() {
        val o=order();ready(o);payments.capture("order_fixture","pay_fixture",o.totalMinor,"INR")
        val first=refunds.request(owner,o.id,"refund-key-0000001",RefundInput(20000,"Approved return"))
        assertEquals(first,refunds.request(owner,o.id,"refund-key-0000001",RefundInput(20000,"Approved return")))
        assertNotNull(refunds.begin(first.id));refunds.unknown(first.id);assertNull(refunds.begin(first.id))
        assertThrows(StateConflict::class.java) { refunds.request(owner,o.id,"refund-key-0000002",RefundInput(o.totalMinor,"Too much")) }
        refunds.resolved(first.id,"rfnd_fixture","processed")
        assertThrows(StateConflict::class.java) { refunds.request(owner,o.id,"refund-key-0000002",RefundInput(o.totalMinor,"Still too much")) }
    }
    @Test fun packingRequiresCapturedPaymentAndSplitAllocationsCannotDuplicateUnits() {
        val o=order()
        val parcel=ParcelInput(500,200,150,50,listOf(OrderLineInput("p1",2)))
        assertThrows(StateConflict::class.java) { packing.create(owner,o.id,"parcel-key-000001",parcel) }
        ready(o);payments.capture("order_fixture","pay_fixture",o.totalMinor,"INR")
        val p=packing.create(owner,o.id,"parcel-key-000001",parcel)
        assertEquals(p,packing.create(owner,o.id,"parcel-key-000001",parcel))
        assertThrows(StateConflict::class.java) { packing.create(owner,o.id,"parcel-key-000002",parcel) }
        packing.create(owner,o.id,"parcel-key-000002",parcel.copy(items=listOf(OrderLineInput("p1",1))))
        assertEquals("PACKED_READY",packing.ready(p.id,0).state);packing.ready(p.id,0)
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM commerce.outbox WHERE event_type='PackagePackedReady'",Int::class.java))
        shipping.tracking(p.id,listOf("Delivered" to java.time.Instant.now()))
        val quoteId=jdbc.queryForObject("SELECT id FROM commerce.checkout_quote LIMIT 1",String::class.java)!!
        assertEquals("PARTIALLY_DELIVERED",checkout.accept(owner,"checkout-key-0001",quoteId).fulfillmentState)
        mvc.perform(post("/v1/staff/packages/${p.id}/ready").with(jwt()).contentType("application/json").content("{\"version\":0}")).andExpect(status().isForbidden)
    }
    @Test fun shippingPurchaseIsSingleAttemptAndUnknownCannotRepurchase() {
        val o=order();ready(o);payments.capture("order_fixture","pay_fixture",o.totalMinor,"INR")
        val p=packing.create(owner,o.id,"parcel-key-000001",ParcelInput(500,200,150,50,listOf(OrderLineInput("p1",3))))
        assertNull(shipping.begin(p.id));packing.ready(p.id,0);assertNotNull(shipping.begin(p.id))
        val rate=mapper.readTree("""{"rateId":"rate-fixture","carrierId":"ATS"}""")
        assertTrue(shipping.purchasing(p.id,"token",rate,java.time.Instant.now().plusSeconds(600)))
        assertFalse(shipping.purchasing(p.id,"token",rate,java.time.Instant.now().plusSeconds(600)))
        shipping.unknown(p.id);assertNull(shipping.begin(p.id))
        assertThrows(StateConflict::class.java) { shipping.requestCancellation(p.id) }
    }
    @Test fun labelRecoveryNeverRebooksAndDelayedTrackingCannotRegressCurrentState() {
        val o=order();ready(o);payments.capture("order_fixture","pay_fixture",o.totalMinor,"INR")
        val p=packing.create(owner,o.id,"parcel-key-000001",ParcelInput(500,200,150,50,listOf(OrderLineInput("p1",3))))
        packing.ready(p.id,0);shipping.begin(p.id);shipping.purchasing(p.id,"token",mapper.readTree("""{"rateId":"r","carrierId":"ATS"}"""),java.time.Instant.now().plusSeconds(600))
        shipping.purchased(p.id,"shipment-fixture","tracking-fixture",null);assertNull(shipping.begin(p.id))
        shipping.booked(p.id,"shipment-fixture","tracking-fixture","labels/fixture.png","PNG",null)
        shipping.booked(p.id,"shipment-fixture","tracking-fixture","labels/fixture.png","PNG",null)
        val pending=jdbc.queryForList("SELECT id FROM commerce.shipment WHERE provider_shipment_id IS NOT NULL AND state NOT IN ('DELIVERED','RETURN_TO_ORIGIN') ORDER BY COALESCE(tracking_polled_at,updated_at) LIMIT 20",String::class.java)
        assertEquals(listOf(p.id),pending)
        val changedAt=jdbc.queryForObject("SELECT updated_at FROM commerce.shipment WHERE id=?",java.sql.Timestamp::class.java,p.id)
        jdbc.update("UPDATE commerce.shipment SET tracking_polled_at=clock_timestamp() WHERE id=?",p.id)
        assertEquals(changedAt,jdbc.queryForObject("SELECT updated_at FROM commerce.shipment WHERE id=?",java.sql.Timestamp::class.java,p.id))
        val at=java.time.Instant.now();shipping.tracking(p.id,listOf("Delivered" to at));shipping.tracking(p.id,listOf("PickupDone" to at.minusSeconds(3600)))
        assertEquals("DELIVERED",packing.view(p.id).state)
        assertEquals("DELIVERED",checkout.accept(owner,"checkout-key-0001",jdbc.queryForObject("SELECT id FROM commerce.checkout_quote LIMIT 1",String::class.java)!!).fulfillmentState)
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM commerce.shipment_document",Int::class.java))
        assertThrows(StateConflict::class.java) { shipping.requestCancellation(p.id) }
    }
    @Test fun optedOutNotificationsNeverSendAndDeliveryAttemptsAreDurable() {
        notifications.update(owner,"verified@example.test","+919999999999",NotificationPreferenceInput(true,true,0))
        val o=order();ready(o);payments.capture("order_fixture","pay_fixture",o.totalMinor,"INR")
        val email=jdbc.queryForObject("SELECT id FROM commerce.notification_delivery WHERE channel='EMAIL'",String::class.java)!!
        val sms=jdbc.queryForObject("SELECT id FROM commerce.notification_delivery WHERE channel='SMS'",String::class.java)!!
        assertNotNull(notifications.begin(email,"EMAIL"));notifications.unknown(email);assertNull(notifications.begin(email,"EMAIL"))
        assertNull(notifications.begin(sms,"SMS",listOf("Different approved text")))
        notifications.update(owner,"verified@example.test","+919999999999",NotificationPreferenceInput(true,false,1))
        assertNull(notifications.begin(sms,"SMS"))
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM commerce.notification_delivery",Int::class.java))
    }
    @Test fun productFamiliesExposeIndependentAvailableVariants() {
        jdbc.update("INSERT INTO commerce.product_family(id,name,slug) VALUES('family','Pads','pads')")
        jdbc.update("UPDATE commerce.product SET family_id='family',variant_label='Regular'")
        jdbc.update("INSERT INTO commerce.product(id,name,sku,price_minor,stock,active,family_id,variant_label) VALUES('p2','Pads Large','SKU2',25000,0,true,'family','Large')")
        mvc.perform(get("/v1/products/p1")).andExpect(status().isOk).andExpect(jsonPath("$.variants.length()").value(2))
            .andExpect(jsonPath("$.variants[1].available").value(false)).andExpect(jsonPath("$.variants[1].priceMinor").value(25000))
    }
    @Test fun repeatedSchemaInitializationPreservesCommerceAndUnrelatedData() {
        jdbc.execute("CREATE SCHEMA unrelated_fixture")
        jdbc.execute("CREATE TABLE unrelated_fixture.sentinel(id INTEGER PRIMARY KEY)")
        jdbc.update("INSERT INTO unrelated_fixture.sentinel VALUES(1)")
        val result=Flyway.configure().dataSource(postgres.jdbcUrl,postgres.username,postgres.password).schemas("commerce").defaultSchema("commerce").load().migrate()
        assertEquals(0,result.migrationsExecuted)
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM unrelated_fixture.sentinel",Int::class.java))
        assertEquals(10,jdbc.queryForObject("SELECT stock FROM commerce.product",Int::class.java))
    }
    @Test fun restrictedRuntimeRoleCannotChangeSchemaGrantsOrUnrelatedData() {
        jdbc.execute("CREATE ROLE wellisha_fixture_runtime")
        jdbc.execute("GRANT USAGE ON SCHEMA commerce TO wellisha_fixture_runtime")
        jdbc.execute("GRANT SELECT ON commerce.product TO wellisha_fixture_runtime")
        java.sql.DriverManager.getConnection(postgres.jdbcUrl,postgres.username,postgres.password).use { connection ->
            connection.createStatement().use { it.execute("SET ROLE wellisha_fixture_runtime") }
            connection.prepareStatement("SELECT stock FROM commerce.product WHERE id=?").use { statement ->
                statement.setString(1,"p1");statement.executeQuery().use { assertTrue(it.next());assertEquals(10,it.getInt(1)) }
            }
            listOf("CREATE TABLE commerce.forbidden(id INTEGER)","DROP TABLE commerce.product",
                "SELECT * FROM commerce.staff_permission","INSERT INTO commerce.staff_permission(issuer,subject,permission) VALUES('x','x','catalog.pricing.write')").forEach { sql ->
                val error=assertThrows(java.sql.SQLException::class.java) { connection.createStatement().use { it.execute(sql) } }
                assertEquals("42501",error.sqlState)
            }
            // PostgreSQL warns and grants nothing when the caller has no grant option.
            connection.createStatement().use { it.execute("GRANT ALL ON commerce.product TO PUBLIC") }
            connection.createStatement().use { statement -> statement.executeQuery("SELECT has_table_privilege('wellisha_fixture_runtime','commerce.product','UPDATE')").use { assertTrue(it.next());assertFalse(it.getBoolean(1)) } }
        }
    }
    @Test fun prepackedKitsKeepOwnStockAndContentChangesInvalidateQuotes() {
        jdbc.update("INSERT INTO commerce.product(id,name,sku,price_minor,stock,active) VALUES('kit','Care Kit','KIT',30000,4,true),('p2','Liners','SKU2',10000,0,true)")
        val now=java.time.Instant.now()
        catalog.updatePricing("kit",owner,PricingInput(0,30000,listOf(OfferInput("Kit offer",OfferKind.FIXED_AMOUNT,1000,now.minusSeconds(60),now.plusSeconds(3600))),"Approved kit price"))
        val contents=listOf(OrderLineInput("p1",2),OrderLineInput("p2",1))
        bundles.update("kit",owner,BundleInput(1,contents,"Approved kit contents"))
        assertEquals(2,catalog.detail("kit").bundleContents.size)
        assertEquals(29000L,catalog.detail("kit").product.priceMinor)
        val kitInput=input.copy(items=listOf(OrderLineInput("kit",1)))
        val old=checkout.quote(owner,kitInput)
        bundles.update("kit",owner,BundleInput(2,listOf(OrderLineInput("p1",1)),"Updated prepacked contents"))
        assertEquals(29000L,catalog.detail("kit").product.priceMinor)
        assertThrows(StateConflict::class.java) { checkout.accept(owner,"kit-checkout-000001",old.id) }
        val quote=checkout.quote(owner,kitInput);checkout.accept(owner,"kit-checkout-000002",quote.id)
        assertEquals(3,jdbc.queryForObject("SELECT stock FROM commerce.product WHERE id='kit'",Int::class.java))
        assertEquals(10,jdbc.queryForObject("SELECT stock FROM commerce.product WHERE id='p1'",Int::class.java))
        assertEquals(0,jdbc.queryForObject("SELECT stock FROM commerce.product WHERE id='p2'",Int::class.java))
        assertThrows(IllegalArgumentException::class.java) { bundles.update("p2",owner,BundleInput(0,listOf(OrderLineInput("kit",1)),"Nested kits rejected")) }
    }
    @Test fun staffRequiresBothScopeAndGrantForRefundAndPacking() {
        val o=order();ready(o);payments.capture("order_fixture","pay_fixture",o.totalMinor,"INR")
        val auth=jwt().jwt { it.subject("staff").claim("iss","https://cognito-idp.ap-south-1.amazonaws.com/test_pool").claim("scope","wellisha/refund.write wellisha/packing.write") }
        val refund=post("/v1/staff/orders/${o.id}/refunds").header("Idempotency-Key","staff-refund-000001").contentType("application/json").content("{\"amountMinor\":100,\"reason\":\"Approved adjustment\"}")
        mvc.perform(refund.with(auth)).andExpect(status().isForbidden)
        jdbc.update("INSERT INTO commerce.staff_permission VALUES(?,?,?)","https://cognito-idp.ap-south-1.amazonaws.com/test_pool","staff","orders.refund.write")
        mvc.perform(post("/v1/staff/orders/${o.id}/refunds").with(auth).header("Idempotency-Key","staff-refund-000001").contentType("application/json").content("{\"amountMinor\":100,\"reason\":\"Approved adjustment\"}")).andExpect(status().isAccepted)
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM commerce.refund_request",Int::class.java))
        mvc.perform(post("/v1/staff/orders/${o.id}/packages").with(auth).header("Idempotency-Key","staff-parcel-000001").contentType("application/json").content(mapper.writeValueAsBytes(ParcelInput(500,200,150,50,listOf(OrderLineInput("p1",3)))))).andExpect(status().isForbidden)
    }
}
