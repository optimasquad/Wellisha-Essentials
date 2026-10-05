package com.wellisha.api

import com.wellisha.commerce.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@WebMvcTest(CommerceController::class,properties=["CHECKOUT_ENABLED=false"])
@Import(CognitoApiSecurityConfiguration::class,ApiExceptionHandler::class,RequestLoggingFilter::class)
class CustomerApiHttpTest {
    @Autowired lateinit var mvc: MockMvc
    @MockitoBean lateinit var customers: CustomerAddressRepository
    @MockitoBean lateinit var commerce: OrderAndShipmentRepository
    @MockitoBean lateinit var decoder: JwtDecoder
    private fun auth() = jwt().jwt { it.subject("alice").claim("iss","https://cognito-idp.ap-south-1.amazonaws.com/test_pool") }
    @BeforeEach fun owner() {
        `when`(customers.resolve("https://cognito-idp.ap-south-1.amazonaws.com/test_pool","alice")).thenReturn(Customer("alice-id"))
    }
    @Test fun missingAuthGetsCorrelationId() {
        mvc.perform(get("/v1/me")).andExpect(status().isUnauthorized).andExpect(header().exists("X-Correlation-ID"))
    }
    @Test fun nullBodyIsRejectedWithoutRepositoryWrites() {
        mvc.perform(post("/v1/me/addresses").with(auth()).contentType("application/json").content("null"))
            .andExpect(status().isBadRequest)
        verifyNoInteractions(commerce)
    }
    @Test fun missingRequiredFieldIsRejected() {
        mvc.perform(post("/v1/me/addresses").with(auth()).contentType("application/json").content("""{"name":"Name"}"""))
            .andExpect(status().isBadRequest).andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
    }
    @Test fun invalidPincodeIsRejected() {
        mvc.perform(post("/v1/me/addresses").with(auth()).contentType("application/json")
            .content("""{"name":"Name","phone":"9999999999","addressLine":"Road","city":"City","state":"MH","pincode":"bad"}"""))
            .andExpect(status().isBadRequest)
    }
    @Test fun privateOrderReadUsesServerOwnedCustomer() {
        `when`(commerce.order("alice-id","other-order")).thenThrow(MissingResource())
        mvc.perform(get("/v1/orders/other-order").with(auth())).andExpect(status().isNotFound)
            .andExpect(jsonPath("$.stackTrace").doesNotExist()).andExpect(header().string("Cache-Control","no-store"))
        verify(commerce).order("alice-id","other-order")
    }
    @Test fun unexpectedFailureDoesNotExposeSecret() {
        `when`(commerce.orders("alice-id")).thenThrow(IllegalStateException("secret=password-sensitive"))
        mvc.perform(get("/v1/orders").with(auth())).andExpect(status().isInternalServerError)
            .andExpect(jsonPath("$.code").value("INTERNAL_ERROR")).andExpect(jsonPath("$.message").doesNotExist())
    }
    @Test fun checkoutRemainsDisabledBeforeProviderAcceptance() {
        mvc.perform(post("/v1/orders").with(auth()).header("Idempotency-Key","test-order-request-01")
            .contentType("application/json").content("""{"addressId":"a1","items":[{"productId":"p1","quantity":1}]}"""))
            .andExpect(status().isServiceUnavailable)
        verifyNoInteractions(commerce)
    }
    @Test fun staffBookingCannotBeExecutedByCustomer() {
        mvc.perform(post("/v1/staff/packages/p1/ready").with(auth())).andExpect(status().isForbidden)
    }
}

