"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

import type { Address } from "@/lib/generated/commerce-types";
const empty = { name: "", phone: "", addressLine: "", city: "", state: "", pincode: "" };
const fields = [
  { key: "name", label: "Full name", autoComplete: "name", maxLength: 120 },
  { key: "phone", label: "Phone number", autoComplete: "tel", maxLength: 20 },
  { key: "addressLine", label: "Street address", autoComplete: "street-address", maxLength: 240 },
  { key: "city", label: "City", autoComplete: "address-level2", maxLength: 80 },
  { key: "state", label: "State", autoComplete: "address-level1", maxLength: 80 },
  { key: "pincode", label: "PIN code", autoComplete: "postal-code", maxLength: 6 },
] as const;
export default function CustomerAddressesPage() {
  const { data: session, status } = useSession();
  const customerId = status === "authenticated" ? session.user.id : "";
  const activeCustomer = useRef(customerId);
  activeCustomer.current = customerId;
  const [result, setResult] = useState<{ customerId: string; addresses: Address[] }>({ customerId: "", addresses: [] });
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const formTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => { setForm(empty); setEditing(null); setNotice(""); setSaving(false); }, [customerId]);
  useEffect(() => {
    const controller = new AbortController();
    setError(""); setNeedsLogin(false); setResult({ customerId: "", addresses: [] });
    if (!customerId) { setLoading(status === "loading"); return () => controller.abort(); }
    setLoading(true);
    async function load() {
      try {
        const response = await fetch("/api/commerce/me/addresses", { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          if (response.status === 401 && !controller.signal.aborted) setNeedsLogin(true);
          throw new Error(response.status === 401 ? "Please sign in to view your addresses." : "Addresses are temporarily unavailable. Please try again.");
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(a => a && typeof a.id === "string" && typeof a.version === "number" && fields.every(f => typeof a[f.key] === "string")))
          throw new Error("Addresses are temporarily unavailable. Please try again.");
        if (!controller.signal.aborted) setResult({ customerId, addresses: data });
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load addresses."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [customerId, status, revision]);
  function edit(address: Address) {
    setEditing(address);
    setForm({ name: address.name, phone: address.phone, addressLine: address.addressLine, city: address.city, state: address.state, pincode: address.pincode });
    setError(""); setNotice(""); formTitle.current?.focus();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !customerId) return;
    setSaving(true); setError(""); setNotice("");
    const address = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    try {
      const response = await fetch("/api/commerce/me/addresses" + (editing ? "/" + encodeURIComponent(editing.id) : ""), {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { version: editing.version, address } : address),
      });
      if (activeCustomer.current !== customerId) return;
      if (!response.ok) {
        if (response.status === 401) { setResult({ customerId: "", addresses: [] }); setNeedsLogin(true); setForm(empty); setEditing(null); }
        throw new Error(response.status === 401 ? "Please sign in to save your address." : response.status === 400 ? "Please check the address fields." : editing && (response.status === 404 || response.status === 409) ? "This address changed or was removed. Refresh your addresses and try again." : "Unable to save the address. Please try again.");
      }
      setForm(empty); setEditing(null); setNotice(editing ? "Address updated." : "Address saved."); setRevision(r => r + 1);
    } catch (e) { if (activeCustomer.current === customerId) setError(e instanceof Error ? e.message : "Unable to save address."); }
    finally { if (activeCustomer.current === customerId) setSaving(false); }
  }
  const addresses = customerId && result.customerId === customerId ? result.addresses : [];
  const signIn = status === "unauthenticated" || needsLogin;
  return <main className="max-w-3xl mx-auto px-4 py-10">
    <nav aria-label="Account" className="flex gap-4 text-sm mb-6"><Link href="/account/orders" className="underline">Orders</Link><Link href="/account/messages" className="underline">Messages</Link></nav>
    <h1 className="text-3xl font-bold mb-2">Your delivery addresses</h1><p className="text-gray-600 mb-6">Manage where your Wellisha orders arrive.</p>
    {notice && !signIn && <p role="status" className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4">{notice}</p>}
    {signIn && <p role="alert" className="rounded-xl border p-4 mb-6">Please sign in to manage your addresses. <Link href="/login?redirect=/account/addresses" className="underline font-medium">Sign in</Link></p>}
    {error && !signIn && <div role="alert" className="mb-6 rounded-xl border border-red-300 p-4">{error} <button type="button" onClick={() => { setEditing(null); setForm(empty); setRevision(r => r + 1); }} className="underline font-medium">Refresh addresses</button></div>}
    {loading ? <p role="status">Loading addresses...</p> : <div className="space-y-3 mb-8">{addresses.map(address => <article key={address.id} className="rounded-xl border p-5">
      <h2 className="font-semibold">{address.name}</h2><p className="mt-2 break-words">{address.addressLine}</p><p>{address.city}, {address.state} {address.pincode}</p><p className="text-gray-600 mt-1">{address.phone}</p>
      <button type="button" disabled={saving} onClick={() => edit(address)} aria-label={"Edit address for " + address.name + " at " + address.addressLine} className="underline font-medium mt-3 disabled:opacity-50">Edit address</button>
    </article>)}{!addresses.length && !error && !signIn && customerId && <div className="rounded-xl border bg-rose-50 p-6"><h2 className="font-semibold">No saved addresses yet</h2><p className="mt-2 text-gray-600">Add your first delivery address below.</p></div>}</div>}
    {customerId && result.customerId === customerId && !signIn && <form onSubmit={save} className="rounded-xl border p-6 grid gap-4" aria-labelledby="address-form-title" aria-busy={saving}>
      <h2 id="address-form-title" ref={formTitle} tabIndex={-1} className="text-xl font-semibold">{editing ? "Edit delivery address" : "Add delivery address"}</h2>
      <fieldset disabled={saving} className="grid gap-4"><legend className="sr-only">Delivery address details</legend>
      {fields.map(field => <label key={field.key} className="grid gap-1">
        <span className="font-medium text-sm">{field.label}</span>
        <input required name={field.key} maxLength={field.maxLength} autoComplete={field.autoComplete}
          type={field.key === "phone" ? "tel" : "text"} inputMode={field.key === "pincode" ? "numeric" : undefined}
          pattern={field.key === "pincode" ? "[1-9][0-9]{5}" : undefined}
          title={field.key === "pincode" ? "Enter a six-digit Indian PIN code." : field.key === "phone" ? "Enter a phone number with 8 to 20 characters." : undefined}
          value={form[field.key]} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))}
          className="border rounded-lg px-3 py-3 focus:ring-2 focus:ring-rose-300 disabled:bg-gray-50" />
      </label>)}</fieldset>
      <div className="flex gap-4"><button disabled={saving || loading} className="bg-purple-800 text-white rounded-lg px-6 py-3 disabled:opacity-50">{saving ? "Saving..." : editing ? "Update address" : "Save address"}</button>
      {editing && <button type="button" disabled={saving} onClick={() => { setEditing(null); setForm(empty); setError(""); }} className="underline">Cancel edit</button>}</div>
    </form>}
  </main>;
}
