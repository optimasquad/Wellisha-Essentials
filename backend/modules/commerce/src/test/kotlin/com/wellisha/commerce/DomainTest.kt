package com.wellisha.commerce
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class DomainTest {
    @Test fun exactMinorUnits() { assertEquals(59700L,Money.line(19900,3)) }
    @Test fun noNegativePrice() { assertThrows(IllegalArgumentException::class.java) { Money.line(-1,1) } }
    @Test fun noZeroQuantity() { assertThrows(IllegalArgumentException::class.java) { Money.line(100,0) } }
    @Test fun noHugeQuantity() { assertThrows(IllegalArgumentException::class.java) { Money.line(100,101) } }
    @Test fun overflowCannotWrap() { assertThrows(ArithmeticException::class.java) { Money.line(Long.MAX_VALUE,2) } }
    @Test fun totalOverflowCannotWrap() { assertThrows(ArithmeticException::class.java) { Money.total(listOf(Long.MAX_VALUE,1)) } }
    @Test fun unpaidParcelCannotBook() { assertFalse(FulfillmentRules.canBook("PENDING","PACKED_READY")) }
    @Test fun unreadyParcelCannotBook() { assertFalse(FulfillmentRules.canBook("CAPTURED","AWAITING_PACKING")) }
    @Test fun paidReadyParcelCanBook() { assertTrue(FulfillmentRules.canBook("CAPTURED","PACKED_READY")) }
    @Test fun labelDoesNotMeanDispatched() { assertEquals("AWAITING_PICKUP",FulfillmentRules.customerState("ReadyForReceive")) }
    @Test fun unknownStateDoesNotMeanDelivered() { assertEquals("DELIVERY_EXCEPTION",FulfillmentRules.customerState("unexpected")) }
}
