"use client";
import {useEffect,useRef,useState} from "react";
import {useSession} from "next-auth/react";
import Link from "next/link";
import Script from "next/script";
import {useLiveCommerce} from "@/hooks/use-live-commerce";
import {isCart,formatMinor} from "@/lib/catalog-data";
import {isQuote,isOrder,isPayment,isAddresses} from "@/lib/checkout-data";
import {createCheckoutQuote,acceptQuote,getPaymentCheckout,CommerceApiError} from "@/lib/generated/commerce-client";
import type {CheckoutQuote} from "@/lib/generated/commerce-types";
type Attempt={customer:string;quoteId:string;key:string;orderId?:string};
export function CommerceCheckout({enabled}:{enabled:boolean}) {
  const {data:session,status}=useSession();const customer=status==='authenticated'?session.user.id:'';
  const active=useRef(customer);active.current=customer;
  const cart=useLiveCommerce('/api/commerce/cart',isCart,customer,!!customer);
  const addresses=useLiveCommerce('/api/commerce/me/addresses',isAddresses,customer,!!customer);
  const [address,setAddress]=useState('');const [quote,setQuote]=useState<{customer:string;value:CheckoutQuote}|null>(null);
  const [attempt,setAttempt]=useState<Attempt|null>(null);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const [sdk,setSdk]=useState(false);
  const submission=useRef(false);const saved=attempt?.customer===customer?attempt:null;const reviewed=quote?.customer===customer?quote.value:null;
  const order=useLiveCommerce('/api/commerce/orders/'+encodeURIComponent(saved?.orderId??'none'),isOrder,customer,!!saved?.orderId);
  useEffect(()=>{setAddress('');setQuote(null);setNotice('');setBusy(false);submission.current=false;
    if(customer){try{const value=JSON.parse(sessionStorage.getItem('wellisha-checkout:'+customer)??'null');setAttempt(value?.customer===customer&&typeof value.quoteId==='string'&&typeof value.key==='string'?value:null);}catch{setAttempt(null);}}else setAttempt(null);
  },[customer]);
  function save(value:Attempt){setAttempt(value);try{sessionStorage.setItem('wellisha-checkout:'+customer,JSON.stringify(value));}catch{setNotice('Your browser cannot save checkout recovery. Keep this page open until the order is confirmed.');}}
  async function review(){if(submission.current||!customer||!cart.data||!address)return;submission.current=true;setBusy(true);setNotice('');
    try{const result=await createCheckoutQuote({addressId:address,items:cart.data.items.map(i=>({productId:i.product.id,quantity:i.quantity}))});if(active.current!==customer)return;if(!isQuote(result))throw Error('Invalid quote');setQuote({customer,value:result});}
    catch{if(active.current===customer)setNotice('Unable to prepare the quote. Refresh your cart and review again.');}
    finally{if(active.current===customer){setBusy(false);submission.current=false;}}
  }
  async function accept(){if(submission.current||!enabled||!customer||(!reviewed&&!saved))return;submission.current=true;setBusy(true);setNotice('');
    const value=saved??{customer,quoteId:reviewed!.id,key:crypto.randomUUID()};save(value);
    try{const result=await acceptQuote({quoteId:value.quoteId},value.key);if(active.current!==customer)return;if(!isOrder(result))throw Error('Invalid order');save({...value,orderId:result.id});setQuote(null);}
    catch(e){if(active.current===customer){if(e instanceof CommerceApiError&&e.status===409){setNotice('The quote expired or prices, address or stock changed. Review a new quote.');setQuote(null);setAttempt(null);sessionStorage.removeItem('wellisha-checkout:'+customer);cart.refresh();}else setNotice('Confirmation is uncertain. Retry the same confirmation to recover the order.');}}
    finally{if(active.current===customer){setBusy(false);submission.current=false;}}
  }
  async function pay(){if(busy||!sdk||!saved?.orderId||!enabled)return;setBusy(true);setNotice('');try{
    const details=await getPaymentCheckout(saved.orderId);if(active.current!==customer)return;if(!isPayment(details)||details.orderId!==saved.orderId||details.amountMinor!==order.data?.totalMinor)throw Error('Payment changed');
    new window.Razorpay({key:details.keyId,amount:details.amountMinor,currency:'INR',name:'Wellisha Essentials',description:'Order payment',order_id:details.providerOrderId,
      handler:()=>{if(active.current===customer){setNotice('Payment submitted. Waiting for verified confirmation.');order.refresh();}},prefill:{name:session?.user.name??'',email:session?.user.email??'',contact:''},theme:{color:'#6b21a8'}}).open();
  }catch{if(active.current===customer)setNotice('Payment is not ready or the reservation expired. Check the order status.');}finally{if(active.current===customer)setBusy(false);}}
  return <section className="max-w-3xl mx-auto px-4 py-10 space-y-6"><h1 className="text-3xl font-bold">Review checkout</h1>
    {enabled&&<Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={()=>setSdk(true)}/>}
    {!customer&&<p><Link href="/login?redirect=/checkout" className="underline">Sign in</Link> to review checkout.</p>}{notice&&<p role="alert">{notice}</p>}
    {!enabled&&<p className="rounded-xl border p-4">Review a price quote now. Payments open after launch checks are complete.</p>}
    {saved?.orderId?<div className="rounded-xl border p-6 space-y-4"><p>Order reference: {saved.orderId}</p>{order.data&&<><p>Payment: {order.data.paymentState.replace(/_/g,' ').toLowerCase()}</p><p>Total: {formatMinor(order.data.totalMinor)}</p>{order.data.paymentState==='PAYMENT_READY'&&<button disabled={busy||!sdk||!enabled||!!order.error} onClick={()=>void pay()} className="rounded-full bg-purple-800 text-white px-6 py-3 disabled:opacity-40">Pay securely</button>}<Link href={'/account/orders/'+encodeURIComponent(saved.orderId)} className="block underline">View order and tracking</Link></>}{order.error&&<p role="alert">{order.error}</p>}</div>
    :saved?<div><p>Recover your previous confirmation before starting another order.</p><button disabled={busy||!enabled} onClick={()=>void accept()} className="underline">Retry confirmation</button></div>
    :<>{(cart.error||addresses.error)&&<p role="alert">{cart.error||addresses.error}</p>}{addresses.data&&<label className="block">Delivery address<select value={address} onChange={e=>{setAddress(e.target.value);setQuote(null);}} className="block border rounded p-3 w-full mt-2"><option value="">Select an address</option>{addresses.data.map(a=><option key={a.id} value={a.id}>{a.name}, {a.addressLine}, {a.city} {a.pincode}</option>)}</select></label>}<Link href="/account/addresses" className="underline">Manage addresses</Link>
      {cart.data&&<div className="space-y-2">{cart.data.items.map(i=><p key={i.id}>{i.product.name} × {i.quantity}: {formatMinor(i.lineTotalMinor)}</p>)}</div>}
      <button disabled={busy||!address||!cart.data?.items.length||cart.data.items.some(i=>!i.purchasable)||!!cart.error||!!addresses.error} onClick={()=>void review()} className="rounded-full border px-6 py-3 disabled:opacity-40">Review current prices</button>
      {reviewed&&<div className="rounded-xl bg-rose-50 p-6 space-y-3"><p>Items: {formatMinor(reviewed.subtotalMinor)}</p><p>Shipping: {formatMinor(reviewed.shippingMinor)}</p><p className="font-semibold">Total: {formatMinor(reviewed.totalMinor)}</p><p className="text-sm">Quote valid until {new Date(reviewed.expiresAt).toLocaleTimeString()}. Prices and stock are checked when you confirm.</p><button disabled={busy||!enabled} onClick={()=>void accept()} className="rounded-full bg-purple-800 text-white px-6 py-3 disabled:opacity-40">Confirm this total</button></div>}</>}
  </section>;
}
