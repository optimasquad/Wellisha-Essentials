"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Address = { id:string; name:string; phone:string; addressLine:string; city:string; state:string; pincode:string };
const empty = { name:"", phone:"", addressLine:"", city:"", state:"", pincode:"" };
export default function CustomerAddressesPage() {
  const [addresses,setAddresses]=useState<Address[]>([]);
  const [form,setForm]=useState(empty);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  async function load() {
    setError("");
    try {
      const response=await fetch("/api/commerce/me/addresses",{cache:"no-store"});
      if(!response.ok) throw new Error(response.status===401 ? "Please sign in with your secure account." : "Addresses are temporarily unavailable.");
      const data:unknown=await response.json();
      if(!Array.isArray(data)) throw new Error("Addresses are temporarily unavailable.");
      setAddresses(data as Address[]);
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to load addresses."); }
    finally { setLoading(false); }
  }
  useEffect(()=>{void load();},[]);
  async function save(e:React.FormEvent) {
    e.preventDefault();setSaving(true);setError("");
    try {
      const response=await fetch("/api/commerce/me/addresses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      if(!response.ok) throw new Error(response.status===400 ? "Please check the address fields." : "Unable to save the address. Please try again.");
      setForm(empty);await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to save address."); }
    finally { setSaving(false); }
  }
  return <main className="max-w-3xl mx-auto px-4 py-10">
    <h1 className="text-3xl font-bold mb-6">Your delivery addresses</h1>
    {error && <div role="alert" className="mb-6 rounded border border-red-300 p-4">{error} <Link href="/login?redirect=/account/addresses" className="underline">Sign in</Link></div>}
    {loading ? <p role="status">Loading addresses…</p> : <div className="space-y-3 mb-8">{addresses.map(a=><article key={a.id} className="rounded-xl border p-4">
      <h2 className="font-semibold">{a.name}</h2><p>{a.addressLine}</p><p>{a.city}, {a.state} {a.pincode}</p><p>{a.phone}</p>
    </article>)}{!addresses.length && !error && <p>No saved addresses yet.</p>}</div>}
    <form onSubmit={save} className="rounded-xl border p-6 grid gap-4">
      <h2 className="text-xl font-semibold">Add delivery address</h2>
      {Object.keys(empty).map(field=><label key={field} className="grid gap-1">
        <span>{({name:"Full name",phone:"Phone number",addressLine:"Street address",city:"City",state:"State",pincode:"PIN code"} as Record<string,string>)[field]}</span>
        <input required maxLength={field==="addressLine"?240:field==="phone"?20:field==="pincode"?6:80}
          autoComplete={field==="name"?"name":field==="phone"?"tel":field==="addressLine"?"street-address":field==="pincode"?"postal-code":"off"}
          value={form[field as keyof typeof empty]} onChange={e=>setForm({...form,[field]:e.target.value})}
          className="border rounded px-3 py-2" />
      </label>)}
      <button disabled={saving} className="bg-purple-800 text-white rounded py-3 disabled:opacity-50">{saving?"Saving…":"Save address"}</button>
    </form>
  </main>;
}

