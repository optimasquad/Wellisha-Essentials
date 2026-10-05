"use client";

import { useEffect, useState } from "react";
import { refreshDelay } from "@/lib/catalog-data";
import { beginVisibleRefresh } from "@/lib/visible-refresh";

// Sequential refresh keeps customer identity, route changes and scheduled prices isolated.
export function useLiveCommerce<T>(url: string, valid: (value: unknown) => value is T, identity = "public", enabled = true) {
  const key = identity + ":" + url;
  const [result, setResult] = useState<{ key: string; value: T } | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(0);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(""); setStatus(0); setLoading(enabled);
    if (!enabled) { setResult(null); return () => controller.abort(); }
    async function load() {
      let delay: number | null = 15000;
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          if ([401,403,404].includes(response.status)) { delay = null; if (!controller.signal.aborted) setResult(null); }
          if (!controller.signal.aborted) setStatus(response.status);
          throw new Error(response.status === 401 ? "Please sign in with your Wellisha commerce account." : response.status === 404 ? "This item is unavailable." : "Updates are temporarily unavailable. Please retry.");
        }
        const data: unknown = await response.json();
        if (!valid(data)) throw new Error("Updates are temporarily unavailable. Please retry.");
        delay = refreshDelay((data as { refreshAfterMs?: number }).refreshAfterMs);
        if (!controller.signal.aborted) { setResult({ key, value: data }); setError(""); setStatus(200); }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to refresh.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
      return delay;
    }
    const stop=beginVisibleRefresh(load,{visible:()=>document.visibilityState!=="hidden",documentEvents:document,windowEvents:window});
    return () => { controller.abort(); stop(); };
  }, [url,key,enabled,valid,revision]);
  return { data: enabled && result?.key === key ? result.value : null, error, status, loading, refresh: () => setRevision(v => v+1) };
}
