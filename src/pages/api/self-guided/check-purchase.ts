/** GET /api/self-guided/check-purchase?session_id=… → { ready, access_token?, language? } (polled by the success page). */
import type { APIRoute } from "astro";
import { jsonResponse } from "../../../lib/self-guided/assets";
import { findPurchaseBySession } from "../../../lib/self-guided/purchase";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const sessionId = url.searchParams.get("session_id") ?? "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return jsonResponse({ error: "Invalid session_id" }, 400);
  try {
    const p = await findPurchaseBySession(sessionId);
    if (!p) return jsonResponse({ ready: false });
    return jsonResponse({ ready: true, access_token: p.access_token, language: p.language });
  } catch (e) {
    console.error("[self-guided] check-purchase:", e);
    return jsonResponse({ error: "Lookup failed" }, 500);
  }
};
