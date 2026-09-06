/** GET /api/self-guided/price?lang=en|fr → live price of that language's product (early bird aware). */
import type { APIRoute } from "astro";
import { fetchPriceInfo } from "../../../lib/self-guided/purchase";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const lang = url.searchParams.get("lang") === "fr" ? "fr" : "en";
  try {
    const p = await fetchPriceInfo(lang);
    return new Response(JSON.stringify(p), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=0, s-maxage=300" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "price unavailable" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
