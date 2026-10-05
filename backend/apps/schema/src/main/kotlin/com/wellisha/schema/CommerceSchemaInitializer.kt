package com.wellisha.schema
import com.wellisha.commerce.PostgresDataSourceConfiguration
import org.flywaydb.core.Flyway
import org.springframework.boot.*
import org.springframework.boot.builder.SpringApplicationBuilder
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Bean
import javax.sql.DataSource

@SpringBootApplication(exclude=[FlywayAutoConfiguration::class])
@Import(PostgresDataSourceConfiguration::class)
class CommerceSchemaInitializer {
    @Bean fun initializeCommerceSchema(dataSource: DataSource) = ApplicationRunner {
        Flyway.configure().dataSource(dataSource).schemas("commerce").defaultSchema("commerce")
            .locations("classpath:db/migration").cleanDisabled(true).load().migrate()
    }
}
fun main(args: Array<String>) {
    val context=SpringApplicationBuilder(CommerceSchemaInitializer::class.java).web(WebApplicationType.NONE).run(*args)
    context.close()
}
