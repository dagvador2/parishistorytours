/**
 * GET /api/self-guided/access?token=…&lang=en|fr
 * Resolves a purchase token: purchase summary + the manifest with signed
 * URLs. The webapp calls it at start and every ~2 h (URL refresh).
 * The access link is time-limited: 410 once it has expired.
 */
import type { APIRoute } from "astro";
import { AssetsError, buildAssets, jsonResponse, type Lang } from "../../../lib/self-guided/assets";
import { accessDaysLeft, accessExpired, accessNotOpenYet, findPurchaseByToken, touchLastAccess } from "../../../lib/self-guided/purchase";
import { welcomePdfExists } from "../../../lib/self-guided/pdf";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token") ?? "";
  try {
    const purchase = await findPurchaseByToken(token);
    if (!purchase) return jsonResponse({ error: "invalid_token" }, 401);
    if (accessExpired(purchase)) {
      return jsonResponse({ error: "expired", accessExpiresAt: purchase.access_expires_at }, 410);
    }
    if (accessNotOpenYet(purchase)) {
      return jsonResponse({ error: "not_open_yet", accessStartsAt: purchase.access_starts_at }, 403);
    }
    const requested = ((url.searchParams.get("lang") ?? purchase.language) as Lang) === "fr" ? "fr" : "en";
    const hasWelcome = await welcomePdfExists(requested).catch(() => false);
    const pdfUrl = hasWelcome ? `${url.origin}/api/self-guided/download-pdf?token=${purchase.access_token}&lang=${requested}` : null;
    const [assets] = await Promise.all([buildAssets(purchase.product_slug, requested, pdfUrl), touchLastAccess(purchase.id).catch(() => {})]);
    return jsonResponse({
      purchase: {
        email: purchase.email,
        language: purchase.language,
        purchasedAt: purchase.purchased_at,
        accessStartsAt: purchase.access_starts_at,
        accessExpiresAt: purchase.access_expires_at,
        daysLeft: accessDaysLeft(purchase),
      },
      assets,
    });
  } catch (e) {
    if (e instanceof AssetsError) return jsonResponse({ error: e.message }, e.status);
    console.error("[self-guided/access]", e);
    return jsonResponse({ error: "Failed to load access", details: e instanceof Error ? e.message : String(e) }, 500);
  }
};
