package com.wellisha.worker

import com.fasterxml.jackson.databind.ObjectMapper
import com.wellisha.commerce.*
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.slf4j.LoggerFactory

@Component
@ConditionalOnProperty(name=["WORKER_MODE"],havingValue="refund")
class RefundWorker(private val refunds: RefundRepository,private val secrets: ProviderSecrets,private val mapper: ObjectMapper,private val jdbc: JdbcClient) {
    private val log=LoggerFactory.getLogger(javaClass)
    private fun gateway(): RazorpayGateway { val secret=secrets.read("RAZORPAY");return RazorpayGateway(mapper,secret.path("keyId").asText(),secret.path("keySecret").asText()) }
    fun process(id: String) {
        val provider=gateway()
        val work=refunds.begin(id) ?: return
        try { val result=provider.refund(work.paymentId,id,work.amountMinor);refunds.resolved(id,result.path("id").asText(),result.path("status").asText()) }
        catch(e: Exception) { refunds.unknown(id);throw e }
    }
    @Scheduled(fixedDelay=30000)
    fun reconcile() {
        try {
            jdbc.sql("UPDATE commerce.refund_request SET state='UNKNOWN' WHERE state='CALLING' AND updated_at<clock_timestamp()-interval '2 minutes'").update()
            val provider=gateway()
            jdbc.sql("SELECT r.id,p.payment_id,r.amount_minor FROM commerce.refund_request r JOIN commerce.captured_payment p ON p.order_id=r.order_id WHERE r.state='UNKNOWN' ORDER BY r.updated_at LIMIT 20")
                .query { rs,_ -> RefundWork(rs.getString("id"),rs.getString("payment_id"),rs.getLong("amount_minor")) }.list().forEach { work ->
                    try {
                    val results=provider.refunds(work.paymentId).filter { it.path("notes").path("wellishaRefundId").asText()==work.id }
                    if(results.size==1) {
                        val result=results.single()
                        if(result.path("amount").asLong(-1)!=work.amountMinor || result.path("payment_id").asText()!=work.paymentId) throw StateConflict()
                        refunds.resolved(work.id,result.path("id").asText(),result.path("status").asText())
                    }
                    } catch(e: Exception) { log.error("refund_lookup_failed refundId={} exceptionType={}",work.id,e.javaClass.simpleName) }
                    finally { jdbc.sql("UPDATE commerce.refund_request SET updated_at=clock_timestamp() WHERE id=:id AND state='UNKNOWN'").param("id",work.id).update() }
                }
        } catch(e: Exception) { log.error("refund_reconcile_failed exceptionType={}",e.javaClass.simpleName) }
    }
}
