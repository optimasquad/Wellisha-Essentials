import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "2.1.21" apply false
    kotlin("plugin.spring") version "2.1.21" apply false
    id("org.springframework.boot") version "3.5.16" apply false
}
allprojects {
    group = "com.wellisha"
    version = "0.1.0"
    repositories { mavenCentral() }
}
subprojects {
    apply(plugin = "org.jetbrains.kotlin.jvm")
    apply(plugin = "org.jetbrains.kotlin.plugin.spring")
    extensions.configure<org.jetbrains.kotlin.gradle.dsl.KotlinJvmProjectExtension> { jvmToolchain(21) }
    tasks.withType<KotlinCompile>().configureEach {
        kotlinOptions { jvmTarget = "21"; freeCompilerArgs += "-Xjsr305=strict" }
    }
    dependencies {
        "implementation"(platform("org.springframework.boot:spring-boot-dependencies:3.5.16"))
        "implementation"(platform("software.amazon.awssdk:bom:2.31.77"))
        "implementation"("org.jetbrains.kotlin:kotlin-reflect")
        "testImplementation"("org.springframework.boot:spring-boot-starter-test")
        "testRuntimeOnly"("org.junit.platform:junit-platform-launcher")
    }
    tasks.withType<Test>().configureEach {
        useJUnitPlatform()
        // Keep JDBC startup and timestamp assertions independent of host timezone aliases.
        systemProperty("user.timezone", "UTC")
        testLogging { events("failed", "skipped"); showStandardStreams = false }
    }
    tasks.withType<org.springframework.boot.gradle.tasks.bundling.BootJar>().configureEach {
        archiveFileName.set("app.jar")
    }
}
