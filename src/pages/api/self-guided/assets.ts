/**
 * GET /api/self-guided/assets?product=left-bank-ww2&lang=en&token=…
 *
 * Manifest with presigned URLs (2 h). Same payload as the `assets` part of
 * /api/self-guided/access; kept as a lighter endpoint for tooling. Requires
 * a valid purchase token.
 */
import type { APIRoute } from "astro";
import { PRODUCT_ID } from "../../../data/self-guided/left-bank-ww2";
import { AssetsError, buildAssets, jsonResponse, type Lang } from "../../../lib/self-guided/assets";
import { findPurchaseByToken } from "../../../lib/self-guided/purchase";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const purchase = await findPurchaseByToken(url.searchParams.get("token") ?? "").catch(() => null);
  if (!purchase) return jsonResponse({ error: "invalid_token" }, 401);
  const product = url.searchParams.get("product") ?? PRODUCT_ID;
  const requested = (url.searchParams.get("lang") ?? purchase.language) as Lang;
  try {
    return jsonResponse(await buildAssets(product, requested));
  } catch (e) {
    if (e instanceof AssetsError) return jsonResponse({ error: e.message }, e.status);
    console.error("[self-guided/assets]", e);
    return jsonResponse({ error: "Failed to load assets", details: e instanceof Error ? e.message : String(e) }, 500);
  }
};
