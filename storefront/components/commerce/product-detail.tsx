"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useLiveCommerce } from "@/hooks/use-live-commerce";
import { isProductDetail } from "@/lib/catalog-data";
import { ProductPrice } from "./catalog";

export function CommerceProductDetail({ slug }: { slug: string }) {
  const live = useLiveCommerce("/api/catalog/"+encodeURIComponent(slug),isProductDetail);
  const { data: session, status } = useSession();
  const identity=(session?.user.id ?? "")+":"+slug;
  const active=useRef(identity); active.current=identity;
  const [quantity,setQuantity] = useState(1);
  const [savingKey,setSavingKey] = useState("");
  const [noticeResult,setNoticeResult] = useState<{key:string;text:string}|null>(null);
  const saving=savingKey===identity;
  const notice=noticeResult?.key===identity ? noticeResult.text : "";
  const product = live.data?.product;
  async function add() {
    if (!product || saving) return;
    setSavingKey(identity); setNoticeResult(null);
    try {
      const response = await fetch("/api/commerce/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId:product.id,quantity }) });
      if(active.current!==identity)return;
      if (!response.ok) throw new Error(response.status===401 ? "Please sign in with your commerce account." : "This quantity is unavailable. Refresh and try again.");
      setNoticeResult({key:identity,text:"Added to your cart. Current offers are applied to the cart automatically."});
      window.dispatchEvent(new Event("wellisha-cart-changed"));
    } catch (e) { if(active.current===identity)setNoticeResult({key:identity,text:e instanceof Error ? e.message : "Unable to add to cart."}); }
    finally { if(active.current===identity)setSavingKey(""); }
  }
  return <section className="max-w-6xl mx-auto px-4 py-10"><Link href="/products" className="underline">Back to products</Link>
    {live.error && <p role="alert" className="my-6">{live.error} <button onClick={live.refresh} className="underline">Retry</button></p>}
    {!product && live.loading && <p role="status" className="my-6">Loading product...</p>}
    {product && <div className="grid md:grid-cols-2 gap-10 mt-6"><div className="relative aspect-square rounded-2xl bg-rose-50 overflow-hidden"><Image src={product.image.startsWith("/") && !product.image.startsWith("//") ? product.image : "/products/wellisha-hero.jpg"} alt={product.name} fill className="object-cover" /></div>
      <div className="space-y-6"><h1 className="text-3xl font-bold">{product.name}</h1><p className="text-gray-600">{product.description}</p><ProductPrice product={product} />
        <label className="flex gap-4 items-center">Quantity<input type="number" min={1} max={100} value={quantity} onChange={e=>setQuantity(Math.min(100,Math.max(1,Number(e.target.value)||1)))} className="border rounded-lg p-3 w-24" /></label>
        <p className="text-sm text-gray-600">Bundle and free-item savings are calculated in your cart. Include free units in the quantity you add.</p>
        {status === "unauthenticated" ? <Link href={"/login?redirect="+encodeURIComponent("/products/"+slug)} className="inline-block rounded-full bg-purple-800 text-white px-6 py-3">Sign in to add to cart</Link> : <button disabled={status!=="authenticated" || saving || !product.available || !!live.error} onClick={() => void add()} className="rounded-full bg-purple-800 text-white px-6 py-3 disabled:opacity-40">{saving ? "Adding..." : product.available ? "Add to cart" : "Sold out"}</button>}
        {notice && <p role="status">{notice} <Link href="/cart" className="underline">View cart</Link></p>}
      </div></div>}
  </section>;
}
