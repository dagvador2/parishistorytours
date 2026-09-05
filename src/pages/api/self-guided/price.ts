/** GET /api/self-guided/price → live price of the digital product (early bird aware). */
import type { APIRoute } from "astro";
import { fetchPriceInfo } from "../../../lib/self-guided/purchase";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const p = await fetchPriceInfo();
    return new Response(JSON.stringify(p), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=0, s-maxage=300" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "price unavailable" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
