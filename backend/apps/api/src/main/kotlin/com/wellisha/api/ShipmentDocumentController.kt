package com.wellisha.api

import org.springframework.core.env.Environment
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import com.wellisha.commerce.MissingResource
import java.time.Duration

data class ShipmentDocumentLink(val url: String,val expiresInSeconds: Int)
@RestController
class ShipmentDocumentController(private val jdbc: JdbcClient,private val env: Environment) {
    @GetMapping("/v1/staff/shipments/{id}/documents")
    fun document(@AuthenticationPrincipal jwt: Jwt,@PathVariable id: String): ShipmentDocumentLink {
        val count=jdbc.sql("SELECT count(*) FROM commerce.staff_permission WHERE issuer=:issuer AND subject=:subject AND permission='fulfillment.pack.write'")
            .param("issuer",jwt.issuer.toString()).param("subject",jwt.subject).query(Long::class.java).single()
        if(count==0L) throw AccessDeniedException("Document permission required")
        val key=jdbc.sql("SELECT bucket_key FROM commerce.shipment_document WHERE shipment_id=:id").param("id",id).query(String::class.java).optional().orElseThrow { MissingResource() }
        return S3Presigner.create().use { signer ->
            val request=GetObjectRequest.builder().bucket(env.getRequiredProperty("SHIPMENT_DOCUMENT_BUCKET")).key(key).responseContentDisposition("attachment").build()
            ShipmentDocumentLink(signer.presignGetObject(GetObjectPresignRequest.builder().signatureDuration(Duration.ofSeconds(60)).getObjectRequest(request).build()).url().toString(),60)
        }
    }
}
