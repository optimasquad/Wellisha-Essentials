plugins { id("org.springframework.boot") }
dependencies {
    implementation(project(":modules:commerce"))
    implementation("org.springframework.boot:spring-boot-starter")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("software.amazon.awssdk:sqs")
}

