package com.wellisha.api
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.security.oauth2.jwt.Jwt
import java.time.Instant

class CognitoAccessValidatorTest {
    private fun token(use:String="access",client:String="expected",subject:String="customer") =
        Jwt.withTokenValue("test").header("alg","RS256").subject(subject)
            .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60))
            .claim("token_use",use).claim("client_id",client).build()
    @Test fun acceptsBoundAccessToken() { assertFalse(CognitoAccessValidator("expected").validate(token()).hasErrors()) }
    @Test fun rejectsIdToken() { assertTrue(CognitoAccessValidator("expected").validate(token(use="id")).hasErrors()) }
    @Test fun rejectsOtherClient() { assertTrue(CognitoAccessValidator("expected").validate(token(client="other")).hasErrors()) }
    @Test fun rejectsMissingSubject() { assertTrue(CognitoAccessValidator("expected").validate(token(subject="")).hasErrors()) }
}

