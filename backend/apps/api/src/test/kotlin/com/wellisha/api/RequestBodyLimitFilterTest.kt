package com.wellisha.api

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.ServletInputStream
import jakarta.servlet.http.HttpServletRequest
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.slf4j.MDC
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.mock.web.DelegatingServletInputStream
import java.io.ByteArrayInputStream
import java.nio.charset.StandardCharsets

class RequestBodyLimitFilterTest {
    private val mapper = ObjectMapper()
    private val filter = RequestBodyLimitFilter(mapper)

    @AfterEach fun clearCorrelation() = MDC.clear()

    @Test fun bodyAtLimitIsReplayedToController() {
        val body = ByteArray(RequestBodyLimitFilter.MAX_BODY_BYTES) { 'a'.code.toByte() }
        val request = request(body)
        var received: ByteArray? = null
        filter.doFilter(request, MockHttpServletResponse(), FilterChain { input, _ ->
            received = input.inputStream.readAllBytes()
            assertEquals(body.size, input.contentLength)
        })
        assertArrayEquals(body, received)
    }

    @Test fun oversizedDeclaredBodyIsRejectedBeforeReadingOrCallingController() {
        val request = object : MockHttpServletRequest("POST", "/v1/orders") {
            override fun getContentLengthLong() = RequestBodyLimitFilter.MAX_BODY_BYTES.toLong() + 1
            override fun getInputStream(): ServletInputStream = error("Body must not be read")
        }
        val response = MockHttpServletResponse()
        filter.doFilter(request, response, FilterChain { _, _ -> fail<Unit>("Controller must not be called") })
        assertEquals(413, response.status)
        assertEquals("REQUEST_BODY_TOO_LARGE", mapper.readTree(response.contentAsString)["code"].asText())
    }

    @Test fun missingContentLengthStillEnforcesLimit() {
        val request = object : MockHttpServletRequest("POST", "/v1/orders") {
            override fun getContentLengthLong() = -1L
        }
        request.setContent(ByteArray(RequestBodyLimitFilter.MAX_BODY_BYTES + 1))
        val response = MockHttpServletResponse()
        filter.doFilter(request, response, FilterChain { _, _ -> fail<Unit>("Controller must not be called") })
        assertEquals(413, response.status)
    }

    @Test fun oversizedStreamReadsOnlyLimitPlusOneBytes() {
        var bytesRead = 0
        val source = object : ByteArrayInputStream(ByteArray(RequestBodyLimitFilter.MAX_BODY_BYTES * 4)) {
            override fun read(): Int = super.read().also { if (it >= 0) bytesRead++ }
            override fun read(bytes: ByteArray, offset: Int, length: Int): Int =
                super.read(bytes, offset, length).also { if (it > 0) bytesRead += it }
        }
        val request = object : MockHttpServletRequest("POST", "/v1/orders") {
            override fun getContentLengthLong() = -1L
            override fun getInputStream() = DelegatingServletInputStream(source)
        }
        val response = MockHttpServletResponse()
        filter.doFilter(request, response, FilterChain { _, _ -> fail<Unit>("Controller must not be called") })
        assertEquals(413, response.status)
        assertEquals(RequestBodyLimitFilter.MAX_BODY_BYTES + 1, bytesRead)
    }

    @Test fun byteLimitCountsUtf8BytesRatherThanCharacters() {
        val body = "€".repeat(6000).toByteArray(StandardCharsets.UTF_8)
        val response = MockHttpServletResponse()
        filter.doFilter(request(body), response, FilterChain { _, _ -> fail<Unit>("Controller must not be called") })
        assertEquals(413, response.status)
    }

    @Test fun compressedBodiesAreRejectedBeforeDecoding() {
        val request = request(byteArrayOf(1, 2, 3))
        request.addHeader("Content-Encoding", "gzip")
        val response = MockHttpServletResponse()
        filter.doFilter(request, response, FilterChain { _, _ -> fail<Unit>("Controller must not be called") })
        assertEquals(415, response.status)
        assertEquals("UNSUPPORTED_CONTENT_ENCODING", mapper.readTree(response.contentAsString)["code"].asText())
    }

    @Test fun identityEncodingAndUtf8ReaderPreserveBody() {
        val request = request("{\"name\":\"अमृता\"}".toByteArray(StandardCharsets.UTF_8))
        request.addHeader("Content-Encoding", "identity")
        var received = ""
        filter.doFilter(request, MockHttpServletResponse(), FilterChain { input, _ ->
            received = (input as HttpServletRequest).reader.readText()
        })
        assertEquals("{\"name\":\"अमृता\"}", received)
    }

    @Test fun rejectionReturnsSafeCorrelationWithoutBodyOrInternalDetails() {
        MDC.put("correlationId", "safe-correlation")
        val request = request("secret=customer-password".repeat(1000).toByteArray())
        val response = MockHttpServletResponse()
        filter.doFilter(request, response, FilterChain { _, _ -> fail<Unit>("Controller must not be called") })
        val error = mapper.readTree(response.contentAsString)
        assertEquals("safe-correlation", error["correlationId"].asText())
        assertEquals(2, error.size())
        assertFalse(response.contentAsString.contains("customer-password"))
        assertEquals("no-store", response.getHeader("Cache-Control"))
    }

    private fun request(body: ByteArray) = MockHttpServletRequest("POST", "/v1/orders").apply {
        contentType = "application/json"
        setContent(body)
    }
}
