import type { CheckoutQuote,OrderView,PaymentCheckout,Address } from "./generated/commerce-types";
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object' && v!==null;
const money=(v:unknown):v is number=>typeof v==='number' && Number.isSafeInteger(v) && v>=0;
export function isQuote(v:unknown):v is CheckoutQuote {
  if(!object(v)||typeof v.id!=='string'||typeof v.addressId!=='string'||v.currency!=='INR'||!money(v.subtotalMinor)||!money(v.shippingMinor)||!money(v.totalMinor)
    ||typeof v.expiresAt!=='string'||!Number.isFinite(Date.parse(v.expiresAt))||!Array.isArray(v.items)||v.items.length<1||v.items.length>50)return false;
  let total=0;const ids=new Set<string>();
  for(const l of v.items){if(!object(l)||typeof l.productId!=='string'||ids.has(l.productId)||!money(l.quantity)||l.quantity<1||l.quantity>100||!money(l.basePriceMinor)||!money(l.discountMinor)||!money(l.totalMinor)||!money(l.priceVersion))return false;
    ids.add(l.productId);const gross=l.basePriceMinor*l.quantity;if(!Number.isSafeInteger(gross)||l.totalMinor+l.discountMinor!==gross)return false;total+=l.totalMinor;}
  return Number.isSafeInteger(total)&&total===v.subtotalMinor&&Number.isSafeInteger(total+v.shippingMinor)&&total+v.shippingMinor===v.totalMinor;
}
export function isOrder(v:unknown):v is OrderView {return object(v)&&['id','currency','paymentState','fulfillmentState','createdAt'].every(k=>typeof v[k]==='string')&&v.currency==='INR'&&money(v.totalMinor)&&Number.isFinite(Date.parse(v.createdAt as string));}
export function isPayment(v:unknown):v is PaymentCheckout {return object(v)&&typeof v.orderId==='string'&&typeof v.providerOrderId==='string'&&/^order_[A-Za-z0-9]+$/.test(v.providerOrderId)&&typeof v.keyId==='string'&&/^rzp_(test|live)_[A-Za-z0-9]+$/.test(v.keyId)&&v.currency==='INR'&&money(v.amountMinor)&&v.amountMinor>0;}
export function isAddresses(v:unknown):v is Address[] {return Array.isArray(v)&&v.length<=100&&v.every(a=>object(a)&&['id','name','phone','addressLine','city','state','pincode'].every(k=>typeof a[k]==='string')&&money(a.version));}
