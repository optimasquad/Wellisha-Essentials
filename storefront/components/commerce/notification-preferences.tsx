"use client";
import {useRef,useState} from 'react';import {useSession} from 'next-auth/react';
import {useLiveCommerce} from '@/hooks/use-live-commerce';
import {updateNotificationPreferences} from '@/lib/generated/commerce-client';
import type {NotificationPreferences} from '@/lib/generated/commerce-types';
const valid=(v:unknown):v is NotificationPreferences=>!!v&&typeof v==='object'&&typeof (v as NotificationPreferences).emailEnabled==='boolean'&&typeof (v as NotificationPreferences).smsEnabled==='boolean'&&Number.isSafeInteger((v as NotificationPreferences).version);
export function CommerceNotificationPreferences(){const {data:session,status}=useSession();const customer=status==='authenticated'?session.user.id:'';const active=useRef(customer);active.current=customer;
 const live=useLiveCommerce('/api/commerce/me/notification-preferences',valid,customer,!!customer);const [busy,setBusy]=useState('');const [notice,setNotice]=useState<{customer:string;text:string}|null>(null);
 async function change(kind:'emailEnabled'|'smsEnabled'){if(!live.data||busy===customer)return;setBusy(customer);try{await updateNotificationPreferences({...live.data,[kind]:!live.data[kind]});if(active.current===customer)live.refresh();}catch{if(active.current===customer)setNotice({customer,text:'Unable to update preferences. Verify your email/phone in your account, then retry.'});}finally{if(active.current===customer)setBusy('');}}
 return <div className="rounded-xl border p-5 space-y-3"><h2 className="font-semibold">Order notifications</h2><p className="text-sm">Updates use your verified account contacts. In-app messages remain available.</p>{live.data&&<div className="flex gap-6">{(['emailEnabled','smsEnabled'] as const).map(kind=><label key={kind}><input type="checkbox" checked={live.data![kind]} disabled={busy===customer||!!live.error} onChange={()=>void change(kind)}/> {kind==='emailEnabled'?'Email':'SMS'}</label>)}</div>}{live.error&&<p role="alert">{live.error}</p>}{notice?.customer===customer&&<p role="alert">{notice.text}</p>}</div>;
}
