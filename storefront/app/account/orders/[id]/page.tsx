"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Order = { id: string; orderNumber?: string; total?: number; totalMinor?: number; currency?: string; paymentState?: string; paymentStatus?: string; fulfillmentState?: string; status?: string };
import type { ShipmentView as Shipment } from "@/lib/generated/commerce-types";
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isOrder(value: unknown, id: string): value is Order {
  return object(value) && value.id === id
    && ["orderNumber", "currency", "paymentState", "paymentStatus", "fulfillmentState", "status"].every(key => value[key] === undefined || typeof value[key] === "string")
    && ["total", "totalMinor"].every(key => value[key] === undefined || (typeof value[key] === "number" && Number.isFinite(value[key])));
}
function isShipment(value: unknown): value is Shipment {
  return object(value) && ["id", "state", "carrier", "updatedAt"].every(key => typeof value[key] === "string")
    && ["trackingId", "estimatedDelivery"].every(key => value[key] === null || typeof value[key] === "string")
    && Array.isArray(value.events) && value.events.every(event => object(event) && typeof event.state === "string" && typeof event.occurredAt === "string");
}
function label(value: string | undefined) { return (value ?? "Not available").replace(/_/g, " ").toLowerCase(); }
function date(value: string | null, dayOnly = false) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not available yet";
  return dayOnly ? new Date(value).toLocaleDateString("en-IN") : new Date(value).toLocaleString("en-IN");
}
function total(order: Order) {
  const amount = order.totalMinor !== undefined ? order.totalMinor / 100 : order.total;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "Not available";
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: order.currency ?? "INR" }).format(amount); }
  catch { return "Not available"; }
}
export default function CustomerOrderDetailsPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const customerId = status === "authenticated" ? session.user.id : "";
  const requestKey = customerId + ":" + params.id;
  const [result, setResult] = useState<{ key: string; order: Order | null; shipments: Shipment[] }>({ key: "", order: null, shipments: [] });
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopPolling = false;
    setResult({ key: "", order: null, shipments: [] });
    setError(""); setTrackingError(""); setNeedsLogin(false);
    if (!customerId) { setLoading(status === "loading"); return () => controller.abort(); }
    setLoading(true);
    async function load() {
      try {
        const response = await fetch("/api/orders/" + encodeURIComponent(params.id), { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403 || response.status === 404) {
            stopPolling = true;
            if (!controller.signal.aborted) { setResult({ key: "", order: null, shipments: [] }); setTrackingError(""); setNeedsLogin(response.status === 401); }
          }
          throw new Error(response.status === 401 ? "Please sign in to view your order." : response.status === 403 || response.status === 404 ? "Order not found." : "Order details are temporarily unavailable. Please try again.");
        }
        const body: unknown = await response.json();
        const order = object(body) && body.order ? body.order : body;
        if (!isOrder(order, params.id)) throw new Error("Order details are temporarily unavailable. Please try again.");
        if (controller.signal.aborted) return;
        setResult(current => ({ key: requestKey, order, shipments: current.key === requestKey ? current.shipments : [] }));
        setError("");
        try {
          const tracking = await fetch("/api/commerce/orders/" + encodeURIComponent(params.id) + "/tracking", { cache: "no-store", signal: controller.signal });
          if (tracking.status === 401 || tracking.status === 403) {
            stopPolling = true;
            if (!controller.signal.aborted) { setResult({ key: "", order: null, shipments: [] }); setNeedsLogin(tracking.status === 401); setError(tracking.status === 403 ? "Order not found." : ""); setTrackingError(""); }
            return;
          }
          if (!tracking.ok) throw new Error();
          const timeline: unknown = await tracking.json();
          if (!Array.isArray(timeline) || !timeline.every(isShipment)) throw new Error();
          if (!controller.signal.aborted) { setResult({ key: requestKey, order, shipments: timeline }); setTrackingError(""); }
        } catch {
          if (!controller.signal.aborted) { setResult({ key: requestKey, order, shipments: [] }); setTrackingError("Shipment details are temporarily unavailable. Please try again."); }
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load order.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          if (!stopPolling) timer = setTimeout(() => void load(), 30000);
        }
      }
    }
    void load();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [customerId, status, params.id, requestKey, revision]);
  const order = customerId && result.key === requestKey ? result.order : null;
  const shipments = order ? result.shipments : [];
  const signIn = status === "unauthenticated" || needsLogin;
  return <main className="max-w-4xl mx-auto px-4 py-10">
    <Link href="/account/orders" className="underline text-sm">Back to orders</Link>
    <h1 className="text-3xl font-bold my-6">Order details</h1>
    {loading && <p role="status">Loading your order...</p>}
    {signIn && <p role="alert" className="rounded-xl border p-4 mb-6">Please sign in to view your order. <Link href={"/login?redirect=" + encodeURIComponent("/account/orders/" + params.id)} className="underline font-medium">Sign in</Link></p>}
    {error && !signIn && <div role="alert" className="rounded-xl border border-red-300 p-4 mb-6">{error} <button onClick={() => setRevision(r => r + 1)} className="underline font-medium">Try again</button></div>}
    {order && <section className="rounded-xl border bg-rose-50 p-6 space-y-3 mb-6" aria-labelledby="order-summary">
      <h2 id="order-summary" className="font-semibold break-words">Order #{order.orderNumber ?? order.id}</h2>
      <dl className="grid sm:grid-cols-3 gap-4"><div><dt className="text-sm text-gray-600">Payment</dt><dd className="font-medium capitalize">{label(order.paymentState ?? order.paymentStatus)}</dd></div>
      <div><dt className="text-sm text-gray-600">Fulfillment</dt><dd className="font-medium capitalize">{label(order.fulfillmentState ?? order.status)}</dd></div>
      <div><dt className="text-sm text-gray-600">Total</dt><dd className="font-semibold">{total(order)}</dd></div></dl>
    </section>}
    {trackingError && <p role="status" className="mb-6">{trackingError} <button onClick={() => setRevision(r => r + 1)} className="underline">Refresh details</button></p>}
    {order && !shipments.length && !trackingError && <section className="rounded-xl border p-6 mb-6"><h2 className="font-semibold">Delivery updates</h2><p className="mt-2 text-gray-600">Tracking will appear here once your shipment is booked. A booking does not mean your package has been picked up.</p></section>}
    {shipments.map(s => <section key={s.id} className="rounded-xl border p-6 mb-4">
      <h2 className="font-semibold">{s.carrier}</h2><p className="capitalize mt-2">Status: {label(s.state)}</p>
      <dl className="mt-4 space-y-2"><div><dt className="text-sm text-gray-600">Tracking number</dt><dd className="break-words">{s.trackingId ?? "Awaiting booking"}</dd></div>
      <div><dt className="text-sm text-gray-600">Estimated delivery</dt><dd>{date(s.estimatedDelivery, true)}</dd></div>
      <div><dt className="text-sm text-gray-600">Last updated</dt><dd>{date(s.updatedAt)}</dd></div></dl>
      {s.events.length > 0 && <ol aria-label="Delivery timeline" className="mt-6 border-l-2 border-rose-200 pl-5 space-y-4">{s.events.map((event, index) => <li key={event.occurredAt + ":" + index}><p className="font-medium capitalize">{label(event.state)}</p><time dateTime={event.occurredAt} className="text-sm text-gray-600">{date(event.occurredAt)}</time></li>)}</ol>}
    </section>)}
    {order && <p className="text-sm text-gray-600 mb-4">Delivery updates refresh every 30 seconds while this page is open.</p>}
    <Link href="/contact" className="inline-block mt-4 underline">Contact support</Link>
  </main>;
}
