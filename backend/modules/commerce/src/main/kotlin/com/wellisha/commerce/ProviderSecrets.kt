package com.wellisha.commerce

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.core.env.Environment
import org.springframework.stereotype.Component
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest

@Component
class ProviderSecrets(private val env: Environment,private val mapper: ObjectMapper) {
    private val cache=mutableMapOf<String,Pair<Long,JsonNode>>()
    @Synchronized fun read(provider: String): JsonNode {
        require(provider in setOf("RAZORPAY","AMAZON_SHIPPING","NOTIFICATION"))
        val now=System.nanoTime()
        cache[provider]?.takeIf { now-it.first<60_000_000_000L }?.let { return it.second }
        val arn=env.getProperty("${provider}_SECRET_ARN")
        val text=if(!arn.isNullOrBlank()) {
            require(arn.startsWith("arn:aws:secretsmanager:"))
            SecretsManagerClient.create().use { it.getSecretValue(GetSecretValueRequest.builder().secretId(arn).build()).secretString() }
        } else {
            check(env.activeProfiles.any { it=="local" || it=="test" }) { "Provider secret reference required" }
            env.getRequiredProperty("${provider}_TEST_SECRET_JSON")
        }
        val result=mapper.readTree(text)
        check(result.isObject)
        cache[provider]=now to result
        return result
    }
}

object WebhookSignatures {
    fun valid(body: ByteArray,signature: String,secret: String): Boolean {
        if(!signature.matches(Regex("[a-fA-F0-9]{64}")) || secret.isBlank()) return false
        val mac=javax.crypto.Mac.getInstance("HmacSHA256")
        mac.init(javax.crypto.spec.SecretKeySpec(secret.toByteArray(Charsets.UTF_8),"HmacSHA256"))
        val received=signature.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
        return java.security.MessageDigest.isEqual(mac.doFinal(body),received)
    }
}
