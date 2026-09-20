/**
 * POST /api/self-guided/start-now  { token }
 * Opens the access immediately for a buyer who chose a later date and wants to
 * walk earlier. Idempotent: an access already open is left alone.
 */
import type { APIRoute } from "astro";
import { jsonResponse } from "../../../lib/self-guided/assets";
import { accessExpired, accessNotOpenYet, findPurchaseByToken, startAccessNow } from "../../../lib/self-guided/purchase";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const token = (body.token ?? "").trim();
  try {
    const purchase = await findPurchaseByToken(token);
    if (!purchase) return jsonResponse({ error: "Invalid token" }, 401);
    if (accessExpired(purchase)) return jsonResponse({ error: "Access expired" }, 410);
    if (!accessNotOpenYet(purchase)) return jsonResponse({ ok: true, alreadyOpen: true });
    const updated = await startAccessNow(purchase);
    return jsonResponse({ ok: true, expiresAt: updated.access_expires_at });
  } catch (e) {
    console.error("[self-guided] start-now:", e);
    return jsonResponse({ error: "Could not open the access" }, 500);
  }
};
