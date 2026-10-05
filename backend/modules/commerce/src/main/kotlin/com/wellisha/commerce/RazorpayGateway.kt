package com.wellisha.commerce

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.Base64

class ProviderOutcomeUnknown : RuntimeException()

/** No POST retry: a lost response may represent a completed provider operation. */
class RazorpayGateway(private val mapper: ObjectMapper,private val keyId: String,private val keySecret: String,
    private val base: URI = URI.create("https://api.razorpay.com/v1/")) {
    private val client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build()
    init { require(base.toString()=="https://api.razorpay.com/v1/" || base.scheme=="http" && base.host=="127.0.0.1") }
    private fun request(path: String,body: Any?=null): JsonNode {
        val auth=Base64.getEncoder().encodeToString("$keyId:$keySecret".toByteArray(Charsets.UTF_8))
        val builder=HttpRequest.newBuilder(base.resolve(path)).timeout(Duration.ofSeconds(10)).header("Authorization","Basic $auth")
            .header("Content-Type","application/json")
        if(body!=null) builder.POST(HttpRequest.BodyPublishers.ofByteArray(mapper.writeValueAsBytes(body))) else builder.GET()
        try {
            val response=client.send(builder.build(),HttpResponse.BodyHandlers.ofInputStream())
            response.body().use { input ->
                val bytes=input.readNBytes(262145)
                if(response.statusCode() !in 200..299 || bytes.size>262144) throw ProviderOutcomeUnknown()
                return mapper.readTree(bytes).also { if(!it.isObject) throw ProviderOutcomeUnknown() }
            }
        } catch(e: Exception) { if(e is InterruptedException) Thread.currentThread().interrupt(); throw ProviderOutcomeUnknown() }
    }
    fun createOrder(setup: PaymentSetup): String {
        val result=request("orders",mapOf("amount" to setup.amountMinor,"currency" to "INR","receipt" to setup.receipt,"partial_payment" to false))
        if(result.path("amount").asLong(-1)!=setup.amountMinor || result.path("currency").asText()!="INR" || result.path("receipt").asText()!=setup.receipt) throw ProviderOutcomeUnknown()
        return result.path("id").asText().also { if(!it.matches(Regex("order_[A-Za-z0-9]+"))) throw ProviderOutcomeUnknown() }
    }
    fun payments(order: String): List<JsonNode> {
        require(order.matches(Regex("order_[A-Za-z0-9]+")))
        val response=request("orders/$order/payments")
        val items=response.path("items")
        if(!items.isArray || items.size()>100) throw ProviderOutcomeUnknown()
        return items.toList()
    }
    fun findOrder(setup: PaymentSetup): String? {
        val response=request("orders?receipt="+java.net.URLEncoder.encode(setup.receipt,Charsets.UTF_8)+"&count=100")
        val items=response.path("items")
        if(!items.isArray || items.size()>=100) throw ProviderOutcomeUnknown()
        val matches=items.filter { it.path("receipt").asText()==setup.receipt }
        if(matches.size>1) throw ProviderOutcomeUnknown()
        return matches.singleOrNull()?.let {
            if(it.path("amount").asLong(-1)!=setup.amountMinor || it.path("currency").asText()!="INR") throw ProviderOutcomeUnknown()
            it.path("id").asText().also { id -> if(!id.matches(Regex("order_[A-Za-z0-9]+"))) throw ProviderOutcomeUnknown() }
        }
    }
    fun refund(payment: String,id: String,amount: Long): JsonNode {
        require(payment.matches(Regex("pay_[A-Za-z0-9]+")) && amount>0)
        val response=request("payments/$payment/refund",mapOf("amount" to amount,"speed" to "normal","receipt" to id,"notes" to mapOf("wellishaRefundId" to id)))
        if(response.path("payment_id").asText()!=payment || response.path("amount").asLong(-1)!=amount || !response.path("id").asText().matches(Regex("rfnd_[A-Za-z0-9]+"))) throw ProviderOutcomeUnknown()
        return response
    }
    fun refunds(payment: String): List<JsonNode> {
        require(payment.matches(Regex("pay_[A-Za-z0-9]+")))
        val response=request("payments/$payment/refunds?count=100")
        if(!response.path("items").isArray) throw ProviderOutcomeUnknown()
        // If there are more than one page, retain UNKNOWN for manual review rather than assume absence.
        if(response.path("items").size()>=100) throw ProviderOutcomeUnknown()
        return response.path("items").toList()
    }
}
