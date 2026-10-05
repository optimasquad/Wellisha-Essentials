"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
type Order = { id:string;orderNumber?:string;total?:number;totalMinor?:number;currency?:string;paymentState?:string;paymentStatus?:string;fulfillmentState?:string;status?:string };
type Shipment = {id:string;state:string;carrier:string;trackingId:string|null;estimatedDelivery:string|null;updatedAt:string;events:{state:string;occurredAt:string}[]};
function label(value:string|undefined) { return (value??"Not available").replace(/_/g," ").toLowerCase(); }
export default function CustomerOrderDetailsPage({params}:{params:{id:string}}) {
  const [order,setOrder]=useState<Order|null>(null);
  const [shipments,setShipments]=useState<Shipment[]>([]);
  const [error,setError]=useState("");
  const [trackingError,setTrackingError]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const controller=new AbortController();
    async function load() {
      try {
        const result=await fetch("/api/orders/"+encodeURIComponent(params.id),{cache:"no-store",signal:controller.signal});
        if(!result.ok) throw new Error(result.status===401?"Please sign in to view your order.":result.status===404?"Order not found.":"Order details are temporarily unavailable.");
        const data=await result.json();setOrder(data.order??data);
        const tracking=await fetch("/api/commerce/orders/"+encodeURIComponent(params.id)+"/tracking",{cache:"no-store",signal:controller.signal});
        if(tracking.ok) { const timeline:unknown=await tracking.json();if(Array.isArray(timeline))setShipments(timeline as Shipment[]); }
        else setTrackingError("Shipment details are not available yet. Please check again later.");
        setError("");
      } catch(e) { if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Unable to load order."); }
      finally { if(!controller.signal.aborted)setLoading(false); }
    }
    void load();const timer=setInterval(()=>void load(),30000);
    return ()=>{controller.abort();clearInterval(timer);};
  },[params.id]);
  return <main className="max-w-4xl mx-auto px-4 py-10">
    <Link href="/account/orders" className="underline">Back to orders</Link>
    <h1 className="text-3xl font-bold my-6">Order details</h1>
    {loading && <p role="status">Loading your order…</p>}
    {error && <p role="alert">{error} <Link href="/login" className="underline">Sign in</Link></p>}
    {order && <section className="border rounded-xl p-6 space-y-2 mb-6">
      <h2 className="font-semibold">Order #{order.orderNumber??order.id}</h2>
      <p>Payment: {label(order.paymentState??order.paymentStatus)}</p>
      <p>Fulfillment: {label(order.fulfillmentState??order.status)}</p>
      <p>Total: {new Intl.NumberFormat("en-IN",{style:"currency",currency:order.currency??"INR"}).format(order.totalMinor!==undefined?order.totalMinor/100:order.total??0)}</p>
    </section>}
    {trackingError && <p role="status" className="mb-6">{trackingError}</p>}
    {shipments.map(s=><section key={s.id} className="border rounded-xl p-6 mb-4">
      <h2 className="font-semibold">{s.carrier}</h2><p>Status: {label(s.state)}</p>
      <p>Tracking number: {s.trackingId??"Awaiting booking"}</p>
      <p>Estimated delivery: {s.estimatedDelivery?new Date(s.estimatedDelivery).toLocaleDateString("en-IN"):"Not available yet"}</p>
      <p>Last updated: {new Date(s.updatedAt).toLocaleString("en-IN")}</p>
      <ol className="mt-4 space-y-2">{s.events.map((e,i)=><li key={i}>{label(e.state)} — {new Date(e.occurredAt).toLocaleString("en-IN")}</li>)}</ol>
    </section>)}
    <Link href="/contact" className="inline-block mt-4 underline">Contact support</Link>
  </main>;
}
