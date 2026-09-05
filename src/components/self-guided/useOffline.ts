/**
 * Registers the audioguide service worker and asks it to precache every
 * asset of the tour (audio, photos, PDF, basemap) as soon as the manifest is
 * known, reporting progress for the menu ("Preparing offline mode… 4/9 audio files").
 */
import { useEffect, useRef, useState } from "react";
import type { AssetsResponse } from "../../lib/self-guided/types";
import { MAP_TILES_URL } from "./mapStyle";
import { assetsUrl } from "./useAssets";
import type { OfflineStatus } from "./Menu";

const SW_URL = "/self-guided-tour/sw.js";
const GLYPHS = ["Noto Sans Regular", "Noto Sans Medium", "Noto Sans Italic"].flatMap((f) => ["0-255", "256-511"].map((r) => `/self-guided/map/fonts/${encodeURIComponent(f)}/${r}.pbf`));

export function offlineUrls(assets: AssetsResponse): string[] {
  const urls = new Set<string>();
  for (const s of assets.sections) {
    urls.add(s.audio);
    for (const m of s.media) urls.add(m.img);
  }
  urls.add(assets.pdf);
  // The API answer for this language (served from cache when offline) and the app pages (both locales).
  urls.add(assetsUrl(assets.lang));
  urls.add("/self-guided-tour/access");
  urls.add("/fr/self-guided-tour/access");
  urls.add(MAP_TILES_URL);
  GLYPHS.forEach((g) => urls.add(g));
  // Everything the page already loaded before the worker took control (scripts, styles, workers of
  // the first visit): otherwise a cold offline start would miss the app shell.
  if (typeof performance !== "undefined") {
    for (const e of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) {
      try {
        const u = new URL(e.name);
        if (u.origin !== window.location.origin) continue;
        if (u.pathname.startsWith("/api/") || u.pathname.endsWith(".pmtiles")) continue;
        if (["script", "link", "css", "other", "fetch"].includes(e.initiatorType)) urls.add(u.pathname + u.search);
      } catch { /* ignore */ }
    }
  }
  return [...urls];
}

export function useOffline(assets: AssetsResponse | null, scope: string): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>({ state: "idle", done: 0, total: 0 });
  const reg = useRef<ServiceWorkerRegistration | null>(null);
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setStatus({ state: "unsupported", done: 0, total: 0 });
      return;
    }
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; state?: OfflineStatus["state"]; done?: number; total?: number; audioDone?: number; audioTotal?: number };
      if (d?.type !== "precache-progress") return;
      setStatus({ state: d.state ?? "preparing", done: d.audioDone ?? 0, total: d.audioTotal ?? 0 });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    navigator.serviceWorker
      .register(SW_URL, { scope })
      .then((r) => { reg.current = r; })
      .catch((err) => { console.warn("[self-guided] service worker registration failed", err); setStatus({ state: "unsupported", done: 0, total: 0 }); });
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [scope]);

  useEffect(() => {
    if (!assets || !("serviceWorker" in navigator)) return;
    // One precache request per manifest generation (signed URLs change, keys do not).
    const stamp = `${assets.lang}:${assets.generatedAt}`;
    if (requestedFor.current === stamp) return;
    requestedFor.current = stamp;
    let cancelled = false;
    navigator.serviceWorker.ready.then((r) => {
      if (cancelled) return;
      const sw = r.active ?? navigator.serviceWorker.controller;
      if (!sw) return;
      setStatus((s) => (s.state === "ready" ? s : { state: "preparing", done: 0, total: assets.sections.length }));
      sw.postMessage({ type: "precache", urls: offlineUrls(assets) });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [assets]);

  return status;
}
