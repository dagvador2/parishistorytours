/**
 * Loads the manifest with signed URLs from our API and keeps it fresh: the
 * URLs expire after ~2 h, so a refetch is scheduled a few minutes before
 * (and on tab focus if the deadline passed while the phone was locked).
 * Offline, the service worker answers with its cached copy.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { PRODUCT_ID, type Lang } from "../../data/self-guided/left-bank-ww2";
import type { AssetsResponse } from "../../lib/self-guided/types";

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export function assetsUrl(lang: Lang): string {
  return `/api/self-guided/assets?product=${PRODUCT_ID}&lang=${lang}`;
}

export function useAssets(requested: Lang) {
  const [assets, setAssets] = useState<AssetsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(assetsUrl(requested));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AssetsResponse;
      setAssets(data);
      const delay = Math.max(30_000, new Date(data.expiresAt).getTime() - Date.now() - REFRESH_MARGIN_MS);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void load(), delay);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [requested]);

  useEffect(() => {
    void load();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setAssets((a) => {
        if (a && new Date(a.expiresAt).getTime() - Date.now() < REFRESH_MARGIN_MS) void load();
        return a;
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { assets, error, loading, reload: load };
}
