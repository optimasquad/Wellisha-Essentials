package com.wellisha.worker
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication(scanBasePackages=["com.wellisha"])
@EnableScheduling
class WellishaOutboxRelayApplication
fun main(args: Array<String>) { runApplication<WellishaOutboxRelayApplication>(*args) }
