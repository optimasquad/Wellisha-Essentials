"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

import type { NotificationView as Message } from "@/lib/generated/commerce-types";
export default function CustomerMessagesPage() {
  const { data: session, status } = useSession();
  const customerId = status === "authenticated" ? session.user.id : "";
  const activeCustomer = useRef(customerId);
  activeCustomer.current = customerId;
  const [result, setResult] = useState<{ customerId: string; messages: Message[] }>({ customerId: "", messages: [] });
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [pendingId, setPendingId] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setResult({ customerId: "", messages: [] });
    setError(""); setNeedsLogin(false); setPendingId("");
    if (!customerId) { setLoading(status === "loading"); return () => controller.abort(); }
    setLoading(true);
    async function load() {
      try {
        const response = await fetch("/api/commerce/me/notifications", { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          if (response.status === 401 && !controller.signal.aborted) setNeedsLogin(true);
          throw new Error(response.status === 401 ? "Please sign in to view your messages." : "Messages are temporarily unavailable. Please try again.");
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(m => m && typeof m.id === "string" && typeof m.orderId === "string" && typeof m.message === "string" && typeof m.createdAt === "string" && typeof m.read === "boolean"))
          throw new Error("Messages are temporarily unavailable. Please try again.");
        if (!controller.signal.aborted) setResult({ customerId, messages: data });
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load messages.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [customerId, status, revision]);
  async function markRead(id: string) {
    if (pendingId) return;
    setPendingId(id); setError("");
    try {
      const response = await fetch("/api/commerce/me/notifications/" + encodeURIComponent(id) + "/read", { method: "PATCH" });
      if (activeCustomer.current !== customerId) return;
      if (!response.ok) {
        if (response.status === 401) { setResult({ customerId: "", messages: [] }); setNeedsLogin(true); }
        throw new Error(response.status === 401 ? "Please sign in to view your messages." : "Unable to mark this message as read. Please try again.");
      }
      setResult(current => current.customerId === customerId ? { ...current, messages: current.messages.map(m => m.id === id ? { ...m, read: true } : m) } : current);
    } catch (e) { if (activeCustomer.current === customerId) setError(e instanceof Error ? e.message : "Unable to update this message."); }
    finally { if (activeCustomer.current === customerId) setPendingId(""); }
  }
  const messages = customerId && result.customerId === customerId ? result.messages : [];
  const signIn = status === "unauthenticated" || needsLogin;
  return <main className="max-w-3xl mx-auto px-4 py-10">
    <nav aria-label="Account" className="flex gap-4 text-sm mb-6"><Link href="/account/orders" className="underline">Orders</Link><Link href="/account/addresses" className="underline">Addresses</Link></nav>
    <h1 className="text-3xl font-bold mb-2">Your messages</h1>
    <p className="text-gray-600 mb-6">Order and delivery updates, all in one place.</p>
    {loading && <p role="status">Loading messages...</p>}
    {signIn && <p role="alert" className="rounded-xl border p-4 mb-6">Please sign in to view your messages. <Link href="/login?redirect=/account/messages" className="underline font-medium">Sign in</Link></p>}
    {error && !signIn && <div role="alert" className="rounded-xl border border-red-300 p-4 mb-6">{error} <button onClick={() => setRevision(r => r + 1)} className="underline font-medium">Try again</button></div>}
    {!loading && !error && !signIn && customerId && !messages.length && <div className="rounded-xl border bg-rose-50 p-8"><h2 className="font-semibold">No messages yet</h2><p className="mt-2 text-gray-600">Your order updates will appear here when available.</p></div>}
    {messages.map(m => <article key={m.id} className={"rounded-xl border p-5 mb-4 " + (m.read ? "bg-white" : "bg-rose-50 border-rose-200")}>
      <p className="text-xs font-semibold text-gray-600 mb-2">{m.read ? "Read" : "Unread"}</p>
      <p className="break-words">{m.message}</p>
      <time dateTime={m.createdAt} className="block text-sm text-gray-600 mt-2">{Number.isNaN(Date.parse(m.createdAt)) ? "Date unavailable" : new Date(m.createdAt).toLocaleString("en-IN")}</time>
      <div className="flex flex-wrap gap-4 mt-4"><Link href={"/account/orders/" + encodeURIComponent(m.orderId)} className="underline font-medium">View order</Link>
        {!m.read && <button disabled={Boolean(pendingId)} onClick={() => void markRead(m.id)} className="underline disabled:opacity-50">{pendingId === m.id ? "Updating..." : "Mark as read"}</button>}</div>
    </article>)}
  </main>;
}
