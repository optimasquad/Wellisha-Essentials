package com.wellisha.commerce

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import java.net.InetSocketAddress
import java.net.URI
import java.util.concurrent.atomic.AtomicInteger

class ProviderGatewayTest {
    private fun server(body: String,status: Int=200,action: (URI,AtomicInteger)->Unit) {
        val calls=AtomicInteger();val http=HttpServer.create(InetSocketAddress("127.0.0.1",0),0)
        http.createContext("/") { exchange ->
            calls.incrementAndGet();exchange.requestBody.readAllBytes()
            val bytes=body.toByteArray();exchange.sendResponseHeaders(status,bytes.size.toLong());exchange.responseBody.use { it.write(bytes) }
        };http.start()
        try { action(URI.create("http://127.0.0.1:${http.address.port}/"),calls) } finally { http.stop(0) }
    }
    @Test fun signedBytesRejectChangesAndInvalidHex() {
        val body="{\"x\":1}".toByteArray();val mac=javax.crypto.Mac.getInstance("HmacSHA256")
        mac.init(javax.crypto.spec.SecretKeySpec("secret".toByteArray(),"HmacSHA256"));val signature=mac.doFinal(body).joinToString("") { "%02x".format(it) }
        assertTrue(WebhookSignatures.valid(body,signature,"secret"))
        assertFalse(WebhookSignatures.valid("{\"x\": 1}".toByteArray(),signature,"secret"))
        assertFalse(WebhookSignatures.valid(body,"z".repeat(64),"secret"))
    }
    @Test fun razorpayOrderRequiresReceiptAndAmountBinding() {
        server("""{"id":"order_fixture","receipt":"order-local","currency":"INR","amount":24900}""") { uri,calls ->
            assertEquals("order_fixture",RazorpayGateway(jacksonObjectMapper(),"key","secret",uri).createOrder(PaymentSetup("order-local",24900,"order-local")))
            assertEquals(1,calls.get())
        }
        server("""{"id":"order_fixture","receipt":"other","currency":"INR","amount":24900}""") { uri,calls ->
            assertThrows(ProviderOutcomeUnknown::class.java) { RazorpayGateway(jacksonObjectMapper(),"key","secret",uri).createOrder(PaymentSetup("order-local",24900,"order-local")) }
            assertEquals(1,calls.get())
        }
    }
    @Test fun providerFailureNeverRetriesAPost() {
        server("{}",503) { uri,calls ->
            assertThrows(ProviderOutcomeUnknown::class.java) { RazorpayGateway(jacksonObjectMapper(),"key","secret",uri).createOrder(PaymentSetup("order-local",24900,"order-local")) }
            assertEquals(1,calls.get())
        }
    }
    @Test fun receiptLookupCannotRebindAmbiguousOrders() {
        server("""{"items":[{"receipt":"r","id":"order_one","currency":"INR","amount":100},{"receipt":"r","id":"order_two","currency":"INR","amount":100}]}""") { uri,_ ->
            assertThrows(ProviderOutcomeUnknown::class.java) { RazorpayGateway(jacksonObjectMapper(),"key","secret",uri).findOrder(PaymentSetup("r",100,"r")) }
        }
    }
    @Test fun refundResponseMustMatchStoredPaymentAndAmount() {
        server("""{"id":"rfnd_fixture","payment_id":"pay_other","amount":100,"status":"processed"}""") { uri,calls ->
            assertThrows(ProviderOutcomeUnknown::class.java) { RazorpayGateway(jacksonObjectMapper(),"key","secret",uri).refund("pay_fixture","ref",100) };assertEquals(1,calls.get())
        }
    }
    @Test fun amazonAdapterUsesBoundedStructuredResponses() {
        server("""{"payload":{"shipmentId":"shipment-fixture","packageDocumentDetails":[]}}""") { uri,calls ->
            val result=AmazonShippingGateway(jacksonObjectMapper(),"fixture-token",uri).purchase("request","rate",jacksonObjectMapper().readTree("{}"))
            assertEquals("shipment-fixture",result.path("shipmentId").asText());assertEquals(1,calls.get())
        }
        server("not json") { uri,calls ->
            assertThrows(ProviderOutcomeUnknown::class.java) { AmazonShippingGateway(jacksonObjectMapper(),"fixture-token",uri).rates(emptyMap<String,String>()) };assertEquals(1,calls.get())
        }
    }
}
