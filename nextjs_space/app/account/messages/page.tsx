"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
type Message={id:string;orderId:string;message:string;createdAt:string;read:boolean};
export default function CustomerMessagesPage() {
  const [messages,setMessages]=useState<Message[]>([]);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
  async function load() {
    try {const response=await fetch("/api/commerce/me/notifications",{cache:"no-store"});
      if(!response.ok)throw new Error(response.status===401?"Please sign in to view your messages.":"Messages are temporarily unavailable.");
      const data:unknown=await response.json();if(!Array.isArray(data))throw new Error("Messages are temporarily unavailable.");
      setMessages(data as Message[]);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load messages.");}finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  async function markRead(id:string) {
    try {const response=await fetch("/api/commerce/me/notifications/"+encodeURIComponent(id)+"/read",{method:"PATCH"});
      if(!response.ok)throw new Error("Unable to mark message as read.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to update message.");}
  }
  return <main className="max-w-3xl mx-auto px-4 py-10">
    <h1 className="text-3xl font-bold mb-6">Your messages</h1>
    {loading&&<p role="status">Loading messages…</p>}{error&&<p role="alert">{error} <Link href="/login" className="underline">Sign in</Link></p>}
    {!loading&&!error&&!messages.length&&<p>No messages yet.</p>}
    {messages.map(m=><article key={m.id} className="border rounded-xl p-5 mb-4">
      <p>{m.message}</p><time>{new Date(m.createdAt).toLocaleString("en-IN")}</time>
      <div className="flex gap-4 mt-3"><Link href={"/account/orders/"+encodeURIComponent(m.orderId)} className="underline">View order</Link>
      {!m.read&&<button onClick={()=>void markRead(m.id)} className="underline">Mark as read</button>}</div>
    </article>)}
  </main>;
}

