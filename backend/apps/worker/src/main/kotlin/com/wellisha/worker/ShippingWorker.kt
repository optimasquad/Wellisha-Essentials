package com.wellisha.worker

import com.fasterxml.jackson.databind.ObjectMapper
import com.wellisha.commerce.*
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.core.env.Environment
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.net.URI
import java.net.http.*
import java.time.Duration
import java.time.Instant
import java.math.BigDecimal
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.core.sync.RequestBody
import org.slf4j.LoggerFactory

@Component
@ConditionalOnProperty(name=["WORKER_MODE"],havingValue="shipping")
class ShippingWorker(private val shipping: ShippingRepository,private val secrets: ProviderSecrets,private val mapper: ObjectMapper,private val jdbc: JdbcClient,private val env: Environment) {
    private val log=LoggerFactory.getLogger(javaClass)
    private var token: Pair<Instant,String>?=null
    @Synchronized private fun provider(): AmazonShippingGateway {
        token?.takeIf { it.first.isAfter(Instant.now().plusSeconds(60)) }?.let { return AmazonShippingGateway(mapper,it.second) }
        val secret=secrets.read("AMAZON_SHIPPING")
        val body=mapOf("grant_type" to "refresh_token","refresh_token" to secret.path("refreshToken").asText(),"client_id" to secret.path("clientId").asText(),"client_secret" to secret.path("clientSecret").asText())
        check(body.values.all { it.isNotBlank() })
        val encoded=body.entries.joinToString("&") { java.net.URLEncoder.encode(it.key,Charsets.UTF_8)+"="+java.net.URLEncoder.encode(it.value,Charsets.UTF_8) }
        val request=HttpRequest.newBuilder(URI.create("https://api.amazon.com/auth/o2/token")).timeout(Duration.ofSeconds(10))
            .header("Content-Type","application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(encoded)).build()
        val response=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build().send(request,HttpResponse.BodyHandlers.ofInputStream())
        val result=response.body().use { val bytes=it.readNBytes(16385);check(bytes.size<=16384 && response.statusCode()==200);mapper.readTree(bytes) }
        val access=result.path("access_token").asText();val seconds=result.path("expires_in").asLong()
        check(access.isNotBlank() && seconds in 120..86400)
        token=Instant.now().plusSeconds(seconds) to access
        return AmazonShippingGateway(mapper,access)
    }
    fun book(id: String) {
        val provider=provider()
        val origin=mapper.readTree(env.getRequiredProperty("SHIPPING_ORIGIN_JSON"))
        val bucket=env.getRequiredProperty("SHIPMENT_DOCUMENT_BUCKET")
        val maxCharge=env.getRequiredProperty("SHIPPING_MAX_CHARGE_MINOR").toLong()
        val work=shipping.begin(id) ?: return
        val destination=work.destination
        val to=mapOf("name" to destination.path("name").asText(),"addressLine1" to destination.path("addressLine").asText(),"city" to destination.path("city").asText(),
            "stateOrRegion" to destination.path("state").asText(),"postalCode" to destination.path("pincode").asText(),"countryCode" to "IN","phoneNumber" to destination.path("phone").asText())
        val rateRequest=mutableMapOf<String,Any>("shipFrom" to origin,"shipTo" to to,"channelDetails" to mapOf("channelType" to "EXTERNAL"),
            "packages" to listOf(mapOf("packageClientReferenceId" to id,"weight" to mapOf("unit" to "KILOGRAM","value" to BigDecimal.valueOf(work.weightGrams.toLong(),3)),
                "dimensions" to mapOf("unit" to "CENTIMETER","length" to BigDecimal.valueOf(work.lengthMm.toLong(),1),"width" to BigDecimal.valueOf(work.widthMm.toLong(),1),"height" to BigDecimal.valueOf(work.heightMm.toLong(),1)),"items" to work.items)))
        env.getProperty("SHIPPING_GST_NUMBER")?.let { rateRequest["taxDetails"]=listOf(mapOf("taxType" to "GST","taxRegistrationNumber" to it)) }
        val quotedAt=Instant.now()
        val rates=provider.rates(rateRequest)
        // Only choose services requiring no additional input, within the approved carrier cost cap.
        val rate=rates.path("rates").filter { !it.path("requiresAdditionalInputs").asBoolean(true) && it.path("totalCharge").path("unit").asText()=="INR" &&
            it.path("totalCharge").path("value").isNumber && it.path("totalCharge").path("value").decimalValue().multiply(BigDecimal(100))<=BigDecimal(maxCharge) &&
            !it.path("availableValueAddedServiceGroups").any { group -> group.path("isRequired").asBoolean() } }
            .minByOrNull { it.path("totalCharge").path("value").decimalValue() } ?: throw StateConflict()
        val spec=rate.path("supportedDocumentSpecifications").firstOrNull { it.path("format").asText() in setOf("PNG","PDF") } ?: throw StateConflict()
        val print=spec.path("printOptions").firstOrNull() ?: throw StateConflict()
        val document=mapper.createObjectNode().put("format",spec.path("format").asText()).put("dpi",print.path("supportedDPIs").first().asInt())
            .put("pageLayout",print.path("supportedPageLayouts").first().asText()).put("needFileJoining",print.path("supportedFileJoiningOptions").first().asBoolean())
        document.set<com.fasterxml.jackson.databind.JsonNode>("size",spec.path("size"))
        document.set<com.fasterxml.jackson.databind.JsonNode>("requestedDocumentTypes",mapper.valueToTree(print.path("supportedDocumentDetails").map { it.path("name").asText() }))
        val requestToken=rates.path("requestToken").asText();check(requestToken.isNotBlank())
        if(!shipping.purchasing(id,requestToken,rate,quotedAt.plusSeconds(600))) return
        try {
            val result=provider.purchase(requestToken,rate.path("rateId").asText(),document)
            val details=result.path("packageDocumentDetails").singleOrNull { it.path("packageClientReferenceId").asText()==id } ?: throw ProviderOutcomeUnknown()
            val label=details.path("packageDocuments").firstOrNull { it.path("type").asText()=="LABEL" } ?: throw ProviderOutcomeUnknown()
            val estimate=result.path("promise").path("deliveryWindow").path("endTime").asText().takeIf { it.isNotBlank() }?.let { Instant.parse(it) }
            shipping.purchased(id,result.path("shipmentId").asText(),details.path("trackingId").asText(),estimate)
            val bytes=java.util.Base64.getDecoder().decode(label.path("contents").asText());check(bytes.size in 1..3_000_000)
            val format=label.path("format").asText();check(format in setOf("PNG","PDF"))
            val key="labels/$id/label."+format.lowercase()
            S3Client.create().use { it.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(if(format=="PDF")"application/pdf" else "image/png").build(),RequestBody.fromBytes(bytes)) }
            shipping.booked(id,result.path("shipmentId").asText(),details.path("trackingId").asText(),key,format,estimate)
        } catch(e: Exception) { shipping.unknown(id);throw e }
    }
    fun cancel(id: String) {
        val provider=provider();val shipment=shipping.beginCancellation(id) ?: return
        try { provider.cancel(shipment);shipping.finishCancellation(id,true) }
        catch(e: Exception) { shipping.finishCancellation(id,false);throw e }
    }
    @Scheduled(fixedDelay=60000) fun reconcileTracking() {
        try {
            // An ambiguous purchase is never repeated. Account-manager/portal review resolves UNKNOWN.
            jdbc.sql("SELECT parcel_id FROM commerce.shipping_attempt WHERE state='PURCHASING' AND updated_at<clock_timestamp()-interval '2 minutes'").query(String::class.java).list().forEach { shipping.unknown(it) }
            val provider=provider()
            jdbc.sql("UPDATE commerce.shipment SET cancellation_state='UNKNOWN' WHERE cancellation_state='CALLING' AND updated_at<clock_timestamp()-interval '2 minutes'").update()
            jdbc.sql("SELECT s.id,s.provider_shipment_id,s.tracking_id FROM commerce.shipment s JOIN commerce.shipping_attempt a ON a.parcel_id=s.id WHERE a.state='DOCUMENT_PENDING' ORDER BY a.updated_at LIMIT 20")
                .query { rs,_ -> Triple(rs.getString(1),rs.getString(2),rs.getString(3)) }.list().forEach { (id,shipment,tracking) ->
                    try {
                    val result=provider.documents(shipment,id);check(result.path("shipmentId").asText()==shipment)
                    val details=result.path("packageDocumentDetail");check(details.path("packageClientReferenceId").asText()==id && details.path("trackingId").asText()==tracking)
                    val label=details.path("packageDocuments").first { it.path("type").asText()=="LABEL" };val format=label.path("format").asText();check(format in setOf("PNG","PDF"))
                    val bytes=java.util.Base64.getDecoder().decode(label.path("contents").asText());check(bytes.size in 1..3_000_000)
                    val key="labels/$id/label."+format.lowercase()
                    S3Client.create().use { it.putObject(PutObjectRequest.builder().bucket(env.getRequiredProperty("SHIPMENT_DOCUMENT_BUCKET")).key(key).contentType(if(format=="PDF")"application/pdf" else "image/png").build(),RequestBody.fromBytes(bytes)) }
                    shipping.booked(id,shipment,tracking,key,format,null)
                    } catch(e: Exception) { log.error("shipping_document_recovery_failed shipmentId={} exceptionType={}",id,e.javaClass.simpleName) }
                    finally { jdbc.sql("UPDATE commerce.shipping_attempt SET updated_at=clock_timestamp() WHERE parcel_id=:id AND state='DOCUMENT_PENDING'").param("id",id).update() }
                }
            jdbc.sql("SELECT id,carrier_id,tracking_id FROM commerce.shipment WHERE provider_shipment_id IS NOT NULL AND state NOT IN ('DELIVERED','RETURN_TO_ORIGIN') ORDER BY COALESCE(tracking_polled_at,updated_at) LIMIT 20")
                .query { rs,_ -> Triple(rs.getString("id"),rs.getString("carrier_id"),rs.getString("tracking_id")) }.list().forEach { (id,carrier,tracking) ->
                    try {
                    val response=provider.tracking(carrier,tracking)
                    check(response.path("trackingId").asText()==tracking)
                    val events=response.path("eventHistory").map { it.path("eventCode").asText() to Instant.parse(it.path("eventTime").asText()) }
                    shipping.tracking(id,events)
                    } catch(e: Exception) { log.error("shipping_tracking_failed shipmentId={} exceptionType={}",id,e.javaClass.simpleName) }
                    finally { jdbc.sql("UPDATE commerce.shipment SET tracking_polled_at=clock_timestamp() WHERE id=:id").param("id",id).update() }
                }
        } catch(e: Exception) { log.error("shipping_reconcile_failed exceptionType={}",e.javaClass.simpleName) }
    }
}
