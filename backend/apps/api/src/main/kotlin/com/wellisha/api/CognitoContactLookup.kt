package com.wellisha.api

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.access.AccessDeniedException
import java.net.URI
import java.net.http.*
import java.time.Duration

data class VerifiedContact(val email: String?,val phone: String?)
@Component
class CognitoContactLookup(private val mapper: ObjectMapper) {
    fun lookup(jwt: Jwt): VerifiedContact {
        if(!jwt.getClaimAsString("scope").orEmpty().split(' ').contains("aws.cognito.signin.user.admin")) throw AccessDeniedException("Verified contact lookup scope required")
        val issuer=jwt.issuer.toString()
        require(issuer.matches(Regex("https://cognito-idp\\.[a-z0-9-]+\\.amazonaws\\.com/[A-Za-z0-9_-]+")))
        val request=HttpRequest.newBuilder(URI.create(issuer.substringBeforeLast('/')+'/')).timeout(Duration.ofSeconds(5))
            .header("Content-Type","application/x-amz-json-1.1").header("X-Amz-Target","AWSCognitoIdentityProviderService.GetUser")
            .POST(HttpRequest.BodyPublishers.ofByteArray(mapper.writeValueAsBytes(mapOf("AccessToken" to jwt.tokenValue)))).build()
        val response=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build().send(request,HttpResponse.BodyHandlers.ofInputStream())
        val body=response.body().use { val bytes=it.readNBytes(65537);check(bytes.size<=65536 && response.statusCode()==200);mapper.readTree(bytes) }
        val attrs=body.path("UserAttributes").associate { it.path("Name").asText() to it.path("Value").asText() }
        check(attrs["sub"]==jwt.subject)
        return VerifiedContact(attrs["email"].takeIf { attrs["email_verified"]=="true" },attrs["phone_number"].takeIf { attrs["phone_number_verified"]=="true" })
    }
}
