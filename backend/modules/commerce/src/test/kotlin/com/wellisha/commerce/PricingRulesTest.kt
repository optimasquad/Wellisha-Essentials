package com.wellisha.commerce

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.time.Instant

class PricingRulesTest {
    private val start=Instant.parse("2026-10-05T00:00:00Z")
    private fun offer(kind: OfferKind,value: Long,buy: Int=1,free: Int=0)=OfferInput("Offer",kind,value,start,start.plusSeconds(3600),buy,free)
    @Test fun percentageUsesIntegerBasisPointsAndRoundsDiscountDown() {
        assertEquals(299L,PricingRules.discount(1999,1,offer(OfferKind.PERCENTAGE,1500)))
        assertEquals(598L,PricingRules.discount(1999,2,offer(OfferKind.PERCENTAGE,1500)))
        assertEquals(0L,PricingRules.discount(1999,1,offer(OfferKind.PERCENTAGE,1500,2)))
    }
    @Test fun fixedAmountIsPerUnitAndCannotMakeThePriceNegative() {
        assertEquals(1000L,PricingRules.discount(2000,2,offer(OfferKind.FIXED_AMOUNT,500)))
        assertThrows(IllegalArgumentException::class.java) { PricingRules.discount(2000,1,offer(OfferKind.FIXED_AMOUNT,2001)) }
    }
    @Test fun bundlesRepeatOnlyForCompleteGroupsAndLeftoversUseBasePrice() {
        val rule=offer(OfferKind.BUNDLE_PRICE,49900,3)
        assertEquals(0L,PricingRules.discount(20000,2,rule))
        assertEquals(10100L,PricingRules.discount(20000,3,rule))
        assertEquals(10100L,PricingRules.discount(20000,4,rule))
        assertEquals(20200L,PricingRules.discount(20000,6,rule))
    }
    @Test fun freeUnitsMustBePresentInCartAndOnlyCompleteGroupsQualify() {
        val rule=offer(OfferKind.BUY_X_GET_Y,0,2,1)
        assertEquals(0L,PricingRules.discount(20000,2,rule))
        assertEquals(20000L,PricingRules.discount(20000,3,rule))
        assertEquals(20000L,PricingRules.discount(20000,5,rule))
        assertEquals(40000L,PricingRules.discount(20000,6,rule))
    }
    @Test fun noRuleIsBasePriceAndInvalidGroupsAreRejected() {
        assertEquals(0L,PricingRules.discount(0,1,null))
        assertThrows(IllegalArgumentException::class.java) { PricingRules.validate(PricingInput(0,2000,listOf(offer(OfferKind.BUY_X_GET_Y,0,100,1)),"reason")) }
        assertThrows(IllegalArgumentException::class.java) { PricingRules.validate(PricingInput(0,2000,listOf(offer(OfferKind.BUNDLE_PRICE,6001,3)),"reason")) }
    }
    @Test fun schedulesMustNotOverlapButAdjacentRulesAreAllowed() {
        val a=offer(OfferKind.PERCENTAGE,1500)
        assertThrows(IllegalArgumentException::class.java) { PricingRules.validate(PricingInput(0,2000,listOf(a,a.copy(title="Other")),"reason")) }
        PricingRules.validate(PricingInput(0,2000,listOf(a,a.copy(startsAt=a.endsAt,endsAt=a.endsAt.plusSeconds(3600))),"reason"))
    }
    @Test fun publicOfferSummariesExplainThresholdsAndFreeUnitCounts() {
        assertEquals("15% off each when you buy 3 or more",PricingRules.summary(offer(OfferKind.PERCENTAGE,1500,3)))
        assertEquals("₹50 off each",PricingRules.summary(offer(OfferKind.FIXED_AMOUNT,5000)))
        assertEquals("3 for ₹499",PricingRules.summary(offer(OfferKind.BUNDLE_PRICE,49900,3)))
        assertEquals("Buy 2, get 1 free. Add 3 units per group.",PricingRules.summary(offer(OfferKind.BUY_X_GET_Y,0,2,1)))
    }
}
