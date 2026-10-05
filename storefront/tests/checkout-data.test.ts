import {test} from 'node:test';import assert from 'node:assert/strict';
import {isQuote,isPayment,isOrder} from '../lib/checkout-data';
import {acceptQuote,getCheckoutQuote,CommerceApiError} from '../lib/generated/commerce-client';
const quote={id:'q',addressId:'a',items:[{productId:'p',quantity:3,basePriceMinor:20000,discountMinor:10100,totalMinor:49900,priceVersion:1}],subtotalMinor:49900,shippingMinor:4900,totalMinor:54800,currency:'INR',expiresAt:'2026-10-05T12:00:00Z'};
test('quote validation rejects inconsistent totals and duplicated or unsafe lines',()=>{
 assert.equal(isQuote(quote),true);assert.equal(isQuote({...quote,totalMinor:1}),false);assert.equal(isQuote({...quote,items:[quote.items[0],quote.items[0]]}),false);
 assert.equal(isQuote({...quote,items:[{...quote.items[0],quantity:101}]}),false);assert.equal(isQuote({...quote,totalMinor:Number.MAX_SAFE_INTEGER+1}),false);
});
test('payment checkout validates provider identity and safe amounts',()=>{
 const payment={orderId:'o',providerOrderId:'order_fixture',keyId:'rzp_test_fixture',amountMinor:54800,currency:'INR'};
 assert.equal(isPayment(payment),true);assert.equal(isPayment({...payment,keyId:'secret'}),false);assert.equal(isPayment({...payment,amountMinor:0}),false);
 assert.equal(isOrder({id:'o',totalMinor:54800,currency:'INR',paymentState:'PAYMENT_READY',fulfillmentState:'AWAITING_PAYMENT',createdAt:'2026-10-05T12:00:00Z'}),true);
});
test('generated transport preserves accepted quote and retry key',async()=>{
 const mock:typeof fetch=async (url,init)=>{assert.equal(url,'/api/commerce/orders');assert.equal(init?.method,'POST');assert.equal((init?.headers as Record<string,string>)['Idempotency-Key'],'same-key');assert.equal(init?.body,'{"quoteId":"q"}');return new Response('{"id":"o"}',{status:202});};
 const result=await acceptQuote({quoteId:'q'},'same-key',{fetch:mock});assert.equal(result.id,'o');
});
test('generated transport encodes identifiers and surfaces safe status errors',async()=>{
 await assert.rejects(getCheckoutQuote('a/b',{fetch:async url=>{assert.equal(url,'/api/commerce/checkout/quotes/a%2Fb');return new Response('{}',{status:409});}}),error=>error instanceof CommerceApiError&&error.status===409);
});
