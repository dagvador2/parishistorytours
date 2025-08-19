import type { APIRoute } from "astro";
import Stripe from "stripe";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

export const prerender = false;

export const fetchActivePrice = async (tour: "left-bank" | "right-bank") => {
  const productIdLeft = import.meta.env.STRIPE_PRODUCT_ID!;
  const productIdRight = import.meta.env.STRIPE_PRODUCT_ID_RIGHT!;
  const prices = await stripe.prices.list({
    product: tour === "left-bank" ? productIdLeft : productIdRight,
    active: true,
  });

  if (!prices.data.length) {
    throw new Error("No active prices found for the product");
  }

  return prices.data[0]; // Return the first active price
};

export const GET: APIRoute = async (ctx) => {
  const url = new URL(ctx.request.url);
  const tour = url.searchParams.get("tour") as "left-bank" | "right-bank";

  console.log("tour", tour);

  if (!tour || (tour !== "left-bank" && tour !== "right-bank")) {
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
