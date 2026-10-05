import { refreshDelay } from "./catalog-data";

type RefreshHost = {
  visible: () => boolean;
  documentEvents: EventTarget;
  windowEvents: EventTarget;
  schedule?: (callback: () => void, delay: number) => () => void;
};

// A null delay stops access-denied/missing-resource refresh until the caller restarts it.
export function beginVisibleRefresh(load: () => Promise<number | null>, host: RefreshHost) {
  const schedule = host.schedule ?? ((callback,delay) => { const timer=setTimeout(callback,delay); return () => clearTimeout(timer); });
  let stopped=false, running=false, closed=false;
  let cancelTimer: (() => void) | undefined;
  const clear = () => { cancelTimer?.(); cancelTimer=undefined; };
  async function refresh() {
    if(closed || stopped || running || !host.visible())return;
    clear(); running=true;
    let delay: number | null=15000;
    try { delay=await load(); }
    finally {
      running=false;
      if(delay===null)stopped=true;
      if(!closed && !stopped && host.visible())cancelTimer=schedule(() => void refresh(),refreshDelay(delay));
    }
  }
  const resume = () => { if(!host.visible())clear(); else void refresh(); };
  host.documentEvents.addEventListener("visibilitychange",resume);
  host.windowEvents.addEventListener("focus",resume);
  host.windowEvents.addEventListener("online",resume);
  void refresh();
  return () => {
    closed=true; clear();
    host.documentEvents.removeEventListener("visibilitychange",resume);
    host.windowEvents.removeEventListener("focus",resume);
    host.windowEvents.removeEventListener("online",resume);
  };
}
