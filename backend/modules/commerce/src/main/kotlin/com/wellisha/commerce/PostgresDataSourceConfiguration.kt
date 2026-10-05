package com.wellisha.commerce

import com.fasterxml.jackson.databind.ObjectMapper
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest
import javax.sql.DataSource

@Configuration
class PostgresDataSourceConfiguration {
    @Bean
    fun dataSource(env: Environment, mapper: ObjectMapper): DataSource {
        val secretArn = env.getProperty("DATABASE_SECRET_ARN")
        val creds = if (!secretArn.isNullOrBlank()) {
            require(secretArn.startsWith("arn:aws:secretsmanager:")) { "Invalid database secret reference" }
            SecretsManagerClient.create().use { client ->
                val text = client.getSecretValue(GetSecretValueRequest.builder().secretId(secretArn).build()).secretString()
                mapper.readTree(text)
            }
        } else null
        val local = env.activeProfiles.contains("local") || env.activeProfiles.contains("test")
        require(creds != null || local) { "AWS Secrets Manager database reference is required outside local/test" }
        val url = env.getRequiredProperty("DATABASE_JDBC_URL")
        if (!local) require(url.contains("sslmode=verify-full")) { "Verified PostgreSQL TLS is required" }
        val cfg = HikariConfig().apply {
            jdbcUrl = url
            username = creds?.get("username")?.asText() ?: env.getRequiredProperty("DATABASE_USERNAME")
            password = creds?.get("password")?.asText() ?: env.getRequiredProperty("DATABASE_PASSWORD")
            require(!username.isNullOrBlank() && !password.isNullOrBlank()) { "Database credentials are required" }
            maximumPoolSize = env.getProperty("DATABASE_POOL_SIZE", Int::class.java, 10)
            connectionTimeout = 5000
            validationTimeout = 3000
            poolName = "wellisha-commerce"
        }
        return HikariDataSource(cfg)
    }
}

