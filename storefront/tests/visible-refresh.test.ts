import test from "node:test";
import assert from "node:assert/strict";
import { beginVisibleRefresh } from "../lib/visible-refresh";

const settle = () => new Promise<void>(resolve => setImmediate(resolve));
function host() {
  const queued: { callback: () => void; delay: number; cancelled: boolean }[] = [];
  const fixture = { isVisible:true, documentEvents:new EventTarget(),windowEvents:new EventTarget(),queued,
    visible:()=>fixture.isVisible,
    schedule:(callback:()=>void,delay:number)=> { const job={callback,delay,cancelled:false};queued.push(job);return()=>{job.cancelled=true;}; } };
  return fixture;
}
test("visible pricing refresh uses the server boundary delay and focus refetches immediately", async () => {
  const h=host(); let reads=0;
  const stop=beginVisibleRefresh(async()=>{reads++;return 2300;},h);
  await settle(); assert.equal(reads,1); assert.equal(h.queued[0].delay,2300);
  h.windowEvents.dispatchEvent(new Event("focus")); await settle();
  assert.equal(reads,2); assert.equal(h.queued[0].cancelled,true);
  stop();
});
test("hidden tabs cancel refresh timers and visible or online events resume", async () => {
  const h=host();let reads=0;
  const stop=beginVisibleRefresh(async()=>{reads++;return 15000;},h);
  await settle();h.isVisible=false;h.documentEvents.dispatchEvent(new Event("visibilitychange"));
  assert.equal(h.queued[0].cancelled,true);
  h.windowEvents.dispatchEvent(new Event("focus"));await settle();assert.equal(reads,1);
  h.isVisible=true;h.documentEvents.dispatchEvent(new Event("visibilitychange"));await settle();assert.equal(reads,2);
  h.windowEvents.dispatchEvent(new Event("online"));await settle();assert.equal(reads,3);
  stop();
});
test("an in-flight request never overlaps and a stopped view cannot reschedule", async () => {
  const h=host();let reads=0;let finish!: (delay:number)=>void;
  const stop=beginVisibleRefresh(()=>{reads++;return new Promise(resolve=>{finish=resolve;});},h);
  h.windowEvents.dispatchEvent(new Event("focus"));h.windowEvents.dispatchEvent(new Event("online"));
  assert.equal(reads,1);stop();finish(15000);await settle();assert.equal(h.queued.length,0);
});
test("denied or missing resources stop background polling and focus retries", async () => {
  const h=host();let reads=0;
  const stop=beginVisibleRefresh(async()=>{reads++;return null;},h);
  await settle();h.windowEvents.dispatchEvent(new Event("focus"));await settle();
  assert.equal(reads,1);assert.equal(h.queued.length,0);stop();
});
