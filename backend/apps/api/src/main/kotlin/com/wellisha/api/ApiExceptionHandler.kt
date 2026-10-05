package com.wellisha.api
import com.wellisha.commerce.*
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.*
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.web.bind.MissingRequestHeaderException
import java.util.UUID
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.dao.TransientDataAccessException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.HttpMediaTypeNotSupportedException
import org.springframework.web.servlet.resource.NoResourceFoundException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException

@RestControllerAdvice
class ApiExceptionHandler {
    private val log=LoggerFactory.getLogger(javaClass)
    private fun error(status: Int,code: String) = ResponseEntity.status(status)
        .header("Cache-Control","no-store").body(mapOf("code" to code,"correlationId" to (MDC.get("correlationId") ?: UUID.randomUUID().toString())))
    @ExceptionHandler(MissingResource::class) fun missing() = error(404,"RESOURCE_NOT_FOUND")
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException::class) fun denied() = error(403,"ACCESS_DENIED")
    @ExceptionHandler(StateConflict::class,DataIntegrityViolationException::class) fun conflict() = error(409,"STATE_CONFLICT")
    @ExceptionHandler(IllegalArgumentException::class,MethodArgumentNotValidException::class,
        HttpMessageNotReadableException::class,MissingRequestHeaderException::class)
    fun invalid() = error(400,"INVALID_REQUEST")
    @ExceptionHandler(MethodArgumentTypeMismatchException::class) fun invalidType() = error(400,"INVALID_REQUEST")
    @ExceptionHandler(HttpRequestMethodNotSupportedException::class) fun unsupportedMethod() = error(405,"METHOD_NOT_ALLOWED")
    @ExceptionHandler(HttpMediaTypeNotSupportedException::class) fun unsupportedMedia() = error(415,"UNSUPPORTED_MEDIA_TYPE")
    @ExceptionHandler(NoResourceFoundException::class) fun absentRoute() = error(404,"RESOURCE_NOT_FOUND")
    @ExceptionHandler(TransientDataAccessException::class)
    fun unavailable(e: TransientDataAccessException): ResponseEntity<Map<String,String>> {
        log.error("database_unavailable exceptionType={}",e.javaClass.simpleName)
        return error(503,"TEMPORARILY_UNAVAILABLE")
    }
    @ExceptionHandler(Exception::class)
    fun failure(e: Exception): ResponseEntity<Map<String,String>> {
        log.error("request_failed exceptionType={} frames={}",e.javaClass.simpleName,
            e.stackTrace.take(6).joinToString(";") { "${it.className}.${it.methodName}:${it.lineNumber}" })
        return error(500,"INTERNAL_ERROR")
    }
}
