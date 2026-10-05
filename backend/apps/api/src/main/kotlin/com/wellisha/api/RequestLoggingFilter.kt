package com.wellisha.api

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.UUID
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.web.servlet.HandlerMapping

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class RequestLoggingFilter : OncePerRequestFilter() {
    private val log=LoggerFactory.getLogger(javaClass)
    override fun doFilterInternal(request: HttpServletRequest,response: HttpServletResponse,chain: FilterChain) {
        val correlation=UUID.randomUUID().toString() // Ignore untrusted inbound log/correlation text.
        val start=System.nanoTime()
        MDC.put("correlationId",correlation)
        response.setHeader("X-Correlation-ID",correlation)
        response.setHeader("Cache-Control","no-store")
        try { chain.doFilter(request,response) }
        finally {
            // No URL/query/body, token, address or customer identifiers in request logs.
            log.info("request_completed method={} route={} status={} durationMs={}",request.method,
                request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE) ?: "unmatched",response.status,
                (System.nanoTime()-start)/1_000_000)
            MDC.remove("correlationId")
        }
    }
}
