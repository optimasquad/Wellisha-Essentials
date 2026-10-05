plugins { id("org.springframework.boot") }
dependencies {
    implementation(project(":modules:commerce"))
    implementation("org.springframework.boot:spring-boot-starter")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
}

