package com.wellisha.api

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.ReadListener
import jakarta.servlet.ServletInputStream
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletRequestWrapper
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.MDC
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.io.BufferedReader
import java.io.ByteArrayInputStream
import java.io.InputStreamReader
import java.nio.charset.StandardCharsets
import java.util.UUID

/** Bounds API bodies before JSON decoding, including requests without Content-Length. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
class RequestBodyLimitFilter(private val objectMapper: ObjectMapper) : OncePerRequestFilter() {
    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        if (request.contentLengthLong > MAX_BODY_BYTES) {
            reject(response, 413, "REQUEST_BODY_TOO_LARGE")
            return
        }
        val encoding = request.getHeader("Content-Encoding")
        if (encoding != null && !encoding.trim().equals("identity", ignoreCase = true)) {
            reject(response, 415, "UNSUPPORTED_CONTENT_ENCODING")
            return
        }
        // Read at most one byte beyond the limit; never buffer an unbounded request.
        val body = request.inputStream.readNBytes(MAX_BODY_BYTES + 1)
        if (body.size > MAX_BODY_BYTES) {
            reject(response, 413, "REQUEST_BODY_TOO_LARGE")
            return
        }
        chain.doFilter(BufferedRequest(request, body), response)
    }

    private fun reject(response: HttpServletResponse, status: Int, code: String) {
        response.status = status
        response.contentType = "application/json"
        response.characterEncoding = StandardCharsets.UTF_8.name()
        response.setHeader("Cache-Control", "no-store")
        objectMapper.writeValue(response.outputStream, mapOf(
            "code" to code,
            "correlationId" to (MDC.get("correlationId") ?: UUID.randomUUID().toString())
        ))
    }

    private class BufferedRequest(request: HttpServletRequest, private val body: ByteArray) :
        HttpServletRequestWrapper(request) {
        override fun getContentLength() = body.size
        override fun getContentLengthLong() = body.size.toLong()
        override fun getInputStream(): ServletInputStream {
            val input = ByteArrayInputStream(body)
            return object : ServletInputStream() {
                override fun read() = input.read()
                override fun read(bytes: ByteArray, offset: Int, length: Int) = input.read(bytes, offset, length)
                override fun isFinished() = input.available() == 0
                override fun isReady() = true
                override fun setReadListener(listener: ReadListener) {
                    check(isAsyncStarted) { "Async mode must be started before registering a read listener" }
                    try {
                        if (!isFinished) listener.onDataAvailable()
                        if (isFinished) listener.onAllDataRead()
                    } catch (failure: Exception) {
                        listener.onError(failure)
                    }
                }
            }
        }
        override fun getReader(): BufferedReader =
            BufferedReader(InputStreamReader(inputStream, StandardCharsets.UTF_8))
    }

    companion object {
        const val MAX_BODY_BYTES = 16 * 1024
    }
}
