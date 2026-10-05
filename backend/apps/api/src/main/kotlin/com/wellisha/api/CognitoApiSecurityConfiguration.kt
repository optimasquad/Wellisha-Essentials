package com.wellisha.api

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.oauth2.core.*
import org.springframework.security.oauth2.jwt.*
import org.springframework.security.web.SecurityFilterChain

class CognitoAccessValidator(private val clientId: String) : OAuth2TokenValidator<Jwt> {
    override fun validate(jwt: Jwt): OAuth2TokenValidatorResult =
        if(jwt.getClaimAsString("token_use")=="access" && jwt.getClaimAsString("client_id")==clientId &&
            jwt.subject?.isNotBlank()==true)
            OAuth2TokenValidatorResult.success()
        else OAuth2TokenValidatorResult.failure(OAuth2Error("invalid_token"))
}
@Configuration
class CognitoApiSecurityConfiguration {
    @Bean
    fun decoder(env: Environment): JwtDecoder {
        val issuer=env.getRequiredProperty("COGNITO_ISSUER")
        require(issuer.matches(Regex("https://cognito-idp\\.[a-z0-9-]+\\.amazonaws\\.com/[A-Za-z0-9_-]+")))
        val client=env.getRequiredProperty("COGNITO_CLIENT_ID")
        require(client.isNotBlank())
        val decoder=NimbusJwtDecoder.withJwkSetUri("$issuer/.well-known/jwks.json").build()
        decoder.setJwtValidator(DelegatingOAuth2TokenValidator(JwtValidators.createDefaultWithIssuer(issuer),CognitoAccessValidator(client)))
        return decoder
    }
    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http.csrf { it.disable() } // Stateless bearer API; browser cookies are never accepted here.
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                it.requestMatchers("/actuator/health","/actuator/health/liveness","/actuator/health/readiness").permitAll()
                it.requestMatchers(HttpMethod.GET,"/v1/products","/v1/products/*","/v1/categories").permitAll()
                it.requestMatchers(HttpMethod.POST,"/v1/webhooks/razorpay").permitAll()
                it.requestMatchers(HttpMethod.PATCH,"/v1/admin/products/*/pricing").hasAuthority("SCOPE_wellisha/pricing.write")
                it.requestMatchers(HttpMethod.GET,"/v1/admin/products/*/pricing").hasAuthority("SCOPE_wellisha/pricing.write")
                it.requestMatchers(HttpMethod.GET,"/v1/admin/products/*/bundle").hasAuthority("SCOPE_wellisha/catalog.write")
                it.requestMatchers(HttpMethod.PATCH,"/v1/admin/products/*/bundle").hasAuthority("SCOPE_wellisha/catalog.write")
                it.requestMatchers("/v1/admin/**").denyAll()
                it.requestMatchers(HttpMethod.POST,"/v1/staff/orders/*/refunds").hasAuthority("SCOPE_wellisha/refund.write")
                it.requestMatchers(HttpMethod.POST,"/v1/staff/orders/*/packages","/v1/staff/packages/*/ready").hasAuthority("SCOPE_wellisha/packing.write")
                it.requestMatchers(HttpMethod.GET,"/v1/staff/shipments/*/documents").hasAuthority("SCOPE_wellisha/packing.write")
                it.requestMatchers(HttpMethod.GET,"/v1/staff/orders","/v1/staff/orders/*/operations").hasAuthority("SCOPE_wellisha/operations.read")
                it.requestMatchers(HttpMethod.POST,"/v1/staff/shipments/*/cancel").hasAuthority("SCOPE_wellisha/shipping.cancel")
                it.requestMatchers("/v1/staff/**").denyAll()
                it.requestMatchers("/v1/**").authenticated()
                it.anyRequest().denyAll()
            }
            .oauth2ResourceServer { it.jwt { } }
        return http.build()
    }
}
