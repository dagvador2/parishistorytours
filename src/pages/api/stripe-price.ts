import type { APIRoute } from "astro";
import { fetchActivePrice, isTourSlug } from "../../lib/stripe-products";

export const prerender = false;

export { fetchActivePrice };

export const GET: APIRoute = async (ctx) => {
  const url = new URL(ctx.request.url);
  const tour = url.searchParams.get("tour");

  if (!tour || !isTourSlug(tour)) {
    return new Response("Invalid or missing tour parameter", { status: 400 });
  }

  try {
    const price = await fetchActivePrice(tour);
    return new Response(JSON.stringify(price), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching price:", err);
    return new Response("Failed to fetch price", { status: 500 });
  }
};
