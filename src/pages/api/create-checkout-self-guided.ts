/**
 * POST /api/create-checkout-self-guided  { email, language }
 * Creates a Stripe Checkout Session (mode payment) for the self-guided tour
 * at the active price (early bird / normal) and returns its URL.
 */
import type { APIRoute } from "astro";
import { getActivePriceId, PRODUCT_SLUG, stripe } from "../../lib/self-guided/purchase";

export const prerender = false;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string; language?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const language = body.language === "fr" ? "fr" : "en";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "Invalid email" }, 400);

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const prefix = language === "fr" ? "/fr" : "";
    const active = getActivePriceId(language);

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: active.priceId, quantity: 1 }],
      customer_email: email,
      locale: language,
      metadata: { product_slug: PRODUCT_SLUG, language, early_bird: active.earlyBird ? "1" : "0" },
      payment_intent_data: { description: `WWII Left Bank Self-Guided Tour (${language.toUpperCase()})` },
      success_url: `${origin}${prefix}/self-guided-tour/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${prefix}/self-guided-tour`,
    });
    return json({ url: session.url });
  } catch (error) {
    console.error("[self-guided] checkout error:", error);
    return json({ error: "Failed to create checkout session", details: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
};
