plugins { id("org.springframework.boot") }
dependencies {
    implementation(project(":modules:commerce"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.flywaydb:flyway-core")
    testImplementation("org.flywaydb:flyway-database-postgresql")
}
tasks.test { exclude("**/*PostgresTest*") }
tasks.processTestResources { from(project(":apps:schema").file("src/main/resources")) { include("db/**") } }
tasks.processTestResources { from(rootProject.file("contracts")) { include("openapi.json") } }
tasks.register<Test>("integrationTest") {
    description = "Real PostgreSQL HTTP/security tests. Requires Docker; never silently skipped."
    group = "verification"
    testClassesDirs = sourceSets.test.get().output.classesDirs
    classpath = sourceSets.test.get().runtimeClasspath
    include("**/*PostgresTest*")
    useJUnitPlatform()
}
