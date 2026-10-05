package com.wellisha.api
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages=["com.wellisha"])
class WellishaApiApplication
fun main(args: Array<String>) { runApplication<WellishaApiApplication>(*args) }

