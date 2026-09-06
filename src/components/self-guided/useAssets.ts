/**
 * Resolves the purchase token and loads the manifest with signed URLs from
 * /api/self-guided/access, keeping it fresh: the URLs expire after ~2 h, so a
 * refetch is scheduled a few minutes before (and on tab focus if the deadline
 * passed while the phone was locked). Offline, the service worker answers
 * with its cached copy.
 *
 * The token comes from the URL (?token=…, the link in the purchase email) and
 * is remembered in localStorage so the installed PWA / a bookmark without the
 * query string keeps working.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "../../data/self-guided/left-bank-ww2";
import type { AccessResponse, AssetsResponse } from "../../lib/self-guided/types";

const REFRESH_MARGIN_MS = 5 * 60 * 1000;
export const TOKEN_KEY = "pht:self-guided:token";

export function resolveToken(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("token");
    if (fromUrl) {
      localStorage.setItem(TOKEN_KEY, fromUrl);
      return fromUrl;
    }
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function accessApiUrl(token: string, lang: Lang): string {
  return `/api/self-guided/access?token=${encodeURIComponent(token)}&lang=${lang}`;
}

export type AssetsErrorKind = "no_token" | "invalid_token" | "expired" | "not_open_yet" | "network";

export function useAssets(requested: Lang) {
  const [assets, setAssets] = useState<AssetsResponse | null>(null);
  const [purchase, setPurchase] = useState<AccessResponse["purchase"] | null>(null);
  const [error, setError] = useState<AssetsErrorKind | null>(null);
  /** when error is "not_open_yet": the date the tour opens */
  const [opensAt, setOpensAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = resolveToken();
    if (!token) {
      setError("no_token");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(accessApiUrl(token, requested));
      if (res.status === 401) {
        try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
        setError("invalid_token");
        return;
      }
      if (res.status === 410) {
        setError("expired");
        return;
      }
      if (res.status === 403) {
        const body = (await res.json().catch(() => ({}))) as { accessStartsAt?: string };
        setOpensAt(body.accessStartsAt ?? null);
        setError("not_open_yet");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AccessResponse;
      setAssets(data.assets);
      setPurchase(data.purchase);
      const delay = Math.max(30_000, new Date(data.assets.expiresAt).getTime() - Date.now() - REFRESH_MARGIN_MS);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void load(), delay);
    } catch {
      setError("network");
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

  return { assets, purchase, error, opensAt, loading, reload: load };
}
