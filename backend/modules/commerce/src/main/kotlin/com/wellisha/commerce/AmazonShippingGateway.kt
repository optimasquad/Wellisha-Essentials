package com.wellisha.commerce

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

class AmazonShippingGateway(private val mapper: ObjectMapper,private val accessToken: String,
    private val base: URI=URI.create("https://sellingpartnerapi-eu.amazon.com/")) {
    private val client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build()
    init { require(base.toString()=="https://sellingpartnerapi-eu.amazon.com/" || base.scheme=="http" && base.host=="127.0.0.1") }
    private fun call(path: String,body: Any?=null,method: String?=null): JsonNode {
        try {
            val request=HttpRequest.newBuilder(base.resolve(path)).timeout(Duration.ofSeconds(15))
                .header("x-amz-access-token",accessToken).header("x-amzn-shipping-business-id","AmazonShipping_IN").header("Content-Type","application/json")
            if(method=="PUT") request.PUT(HttpRequest.BodyPublishers.noBody()) else if(body==null) request.GET() else request.POST(HttpRequest.BodyPublishers.ofByteArray(mapper.writeValueAsBytes(body)))
            val response=client.send(request.build(),HttpResponse.BodyHandlers.ofInputStream())
            response.body().use {
                val bytes=it.readNBytes(4_194_305)
                if(response.statusCode() !in 200..299 || bytes.size>4_194_304) throw ProviderOutcomeUnknown()
                val json=mapper.readTree(bytes)
                if(method=="PUT") return json.also { if(!it.isObject) throw ProviderOutcomeUnknown() }
                return json.path("payload").also { node -> if(!node.isObject) throw ProviderOutcomeUnknown() }
            }
        } catch(e: Exception) { if(e is InterruptedException)Thread.currentThread().interrupt();throw ProviderOutcomeUnknown() }
    }
    fun rates(request: Any)=call("shipping/v2/shipments/rates",request)
    fun purchase(token: String,rate: String,spec: JsonNode)=call("shipping/v2/shipments",mapOf("requestToken" to token,"rateId" to rate,"requestedDocumentSpecification" to spec))
    fun tracking(carrier: String,tracking: String): JsonNode=call("shipping/v2/tracking?carrierId="+java.net.URLEncoder.encode(carrier,Charsets.UTF_8)+"&trackingId="+java.net.URLEncoder.encode(tracking,Charsets.UTF_8))
    fun documents(shipment: String,parcel: String)=call("shipping/v2/shipments/"+java.net.URLEncoder.encode(shipment,Charsets.UTF_8)+"/documents?packageClientReferenceId="+java.net.URLEncoder.encode(parcel,Charsets.UTF_8))
    fun cancel(shipment: String)=call("shipping/v2/shipments/"+java.net.URLEncoder.encode(shipment,Charsets.UTF_8)+"/cancel",method="PUT")
}
