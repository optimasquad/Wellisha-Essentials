package com.wellisha.api

import com.wellisha.commerce.*
import jakarta.validation.Valid
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*

@RestController
class NotificationPreferenceController(private val customers: CustomerAddressRepository,private val notifications: NotificationRepository,private val contacts: CognitoContactLookup) {
    // Cognito access tokens do not necessarily carry contact claims. Missing verified
    // claims disable external delivery; never accept an arbitrary browser destination.
    @GetMapping("/v1/me/notification-preferences") fun view(@AuthenticationPrincipal jwt: Jwt): NotificationPreferences {
        val contact=contacts.lookup(jwt);return notifications.preferences(customers.resolve(jwt.issuer.toString(),jwt.subject).id,contact.email,contact.phone)
    }
    @PatchMapping("/v1/me/notification-preferences") fun update(@AuthenticationPrincipal jwt: Jwt,@Valid @RequestBody input: NotificationPreferenceInput): NotificationPreferences {
        val contact=contacts.lookup(jwt);return notifications.update(customers.resolve(jwt.issuer.toString(),jwt.subject).id,contact.email,contact.phone,input)
    }
}
