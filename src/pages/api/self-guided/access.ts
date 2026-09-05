/**
 * GET /api/self-guided/access?token=…&lang=en|fr
 * Resolves a purchase token: purchase summary + the manifest with signed
 * URLs. The webapp calls it at start and every ~2 h (URL refresh).
 */
import type { APIRoute } from "astro";
import { AssetsError, buildAssets, jsonResponse, type Lang } from "../../../lib/self-guided/assets";
import { downloadAvailable, findPurchaseByToken, touchLastAccess } from "../../../lib/self-guided/purchase";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token") ?? "";
  try {
    const purchase = await findPurchaseByToken(token);
    if (!purchase) return jsonResponse({ error: "invalid_token" }, 401);
    const requested = ((url.searchParams.get("lang") ?? purchase.language) as Lang) === "fr" ? "fr" : "en";
    const pdfUrl = `${url.origin}/api/self-guided/download-pdf?token=${purchase.access_token}&lang=${requested}`;
    const [assets] = await Promise.all([buildAssets(purchase.product_slug, requested, pdfUrl), touchLastAccess(purchase.id).catch(() => {})]);
    return jsonResponse({
      purchase: {
        email: purchase.email,
        language: purchase.language,
        purchasedAt: purchase.purchased_at,
        downloadExpiresAt: purchase.download_expires_at,
        downloadAvailable: downloadAvailable(purchase),
        zipUrl: `${url.origin}/api/self-guided/download-zip?token=${purchase.access_token}&lang=${requested}`,
      },
      assets,
    });
  } catch (e) {
    if (e instanceof AssetsError) return jsonResponse({ error: e.message }, e.status);
    console.error("[self-guided/access]", e);
    return jsonResponse({ error: "Failed to load access", details: e instanceof Error ? e.message : String(e) }, 500);
  }
};
