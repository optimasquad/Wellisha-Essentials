"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useLiveCommerce } from "@/hooks/use-live-commerce";
import { formatMinor, isCart } from "@/lib/catalog-data";

export function CommerceCart() {
  const { data:session,status } = useSession();
  const customer = status === "authenticated" ? session.user.id : "";
  const activeCustomer = useRef(customer); activeCustomer.current=customer;
  const live = useLiveCommerce("/api/commerce/cart",isCart,customer,!!customer);
  const [pending,setPending]=useState<{customer:string;id:string}|null>(null);
  const [notice,setNotice]=useState<{customer:string;text:string}|null>(null);
  const busy = pending?.customer === customer;
  async function mutate(id:string,quantity?:number) {
    if(busy || !customer) return;
    setPending({customer,id}); setNotice(null);
    try {
      const response=await fetch("/api/commerce/cart/items/"+encodeURIComponent(id), { method:quantity===undefined ? "DELETE" : "PATCH", headers:{"Content-Type":"application/json"}, ...(quantity===undefined ? {} : {body:JSON.stringify({quantity})}) });
      if(activeCustomer.current!==customer)return;
      if(!response.ok) throw new Error(response.status===401 ? "Please sign in again." : "The cart changed or this quantity is unavailable. Refresh and try again.");
      live.refresh(); window.dispatchEvent(new Event("wellisha-cart-changed"));
    } catch(e) { if(activeCustomer.current===customer){setNotice({customer,text:e instanceof Error ? e.message : "Unable to update cart."});live.refresh();} }
    finally { if(activeCustomer.current===customer)setPending(null); }
  }
  return <section className="max-w-4xl mx-auto px-4 py-10"><h1 className="text-3xl font-bold mb-6">Your cart</h1>
    {status==="unauthenticated" && <p>Please <Link href="/login?redirect=/cart" className="underline">sign in</Link> to view your cart.</p>}
    {(status==="loading" || customer && live.loading && !live.data) && <p role="status">Loading your cart...</p>}
    {customer && live.error && <p role="alert" className="mb-6 border rounded-xl p-4">{live.error} <button onClick={live.refresh} className="underline">Refresh cart</button></p>}
    {notice?.customer===customer && <p role="alert" className="mb-6">{notice.text}</p>}
    {live.data && <><div className="space-y-4">{live.data.items.map(item => <article key={item.id} className="rounded-xl border p-5 flex flex-wrap justify-between gap-6">
      <div><Link href={"/products/"+encodeURIComponent(item.product.slug)} className="font-semibold text-lg underline">{item.product.name}</Link><p className="text-sm mt-2">Base price: {formatMinor(item.product.basePriceMinor)} each</p>{item.product.offerTitle && <p className="text-sm text-purple-800 mt-1">{item.product.offerTitle}</p>}{item.product.offerSummary && <p className="text-sm mt-1">{item.product.offerSummary}</p>}{!item.purchasable && <p className="text-red-700 text-sm mt-2">This quantity is currently unavailable.</p>}</div>
      <div className="space-y-3 text-right"><p className="font-semibold">{formatMinor(item.lineTotalMinor)}</p>{item.lineDiscountMinor>0 && <p className="text-sm text-green-800">You save {formatMinor(item.lineDiscountMinor)}</p>}
        <div className="flex gap-4 items-center"><button aria-label={"Decrease "+item.product.name} disabled={busy || item.quantity<=1 || !!live.error} onClick={()=>void mutate(item.id,item.quantity-1)} className="border rounded px-3 disabled:opacity-30">−</button><span>{item.quantity}</span><button aria-label={"Increase "+item.product.name} disabled={busy || item.quantity>=100 || !!live.error} onClick={()=>void mutate(item.id,item.quantity+1)} className="border rounded px-3 disabled:opacity-30">+</button></div>
        <button disabled={busy || !!live.error} onClick={()=>void mutate(item.id)} className="text-sm underline disabled:opacity-30">Remove</button></div>
    </article>)}</div>
    {!live.data.items.length && <p className="my-6">Your cart is empty. <Link href="/products" className="underline">Explore products</Link></p>}
    {!!live.data.items.length && <div className="mt-8 rounded-xl bg-rose-50 p-6 space-y-3"><div className="flex justify-between font-semibold text-xl"><span>Item subtotal</span><span>{formatMinor(live.data.subtotalMinor)}</span></div><p className="text-green-800">Offer savings: {formatMinor(live.data.savingsMinor)}</p><p className="text-sm text-gray-600">Offers apply automatically to qualifying quantities. Shipping and final totals will be confirmed when checkout becomes available.</p><Link href="/checkout" className="inline-block rounded-full bg-purple-800 text-white px-6 py-3">Review checkout</Link></div>}</>}
  </section>;
}
