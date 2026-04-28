import type { APIRoute } from "astro";
import Stripe from "stripe";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { sessionId, participants, email, name, tour, date, time, price, locale } =
      await request.json();
    const langPrefix = locale === 'fr' ? '/fr' : '';

    const productIdLeft = import.meta.env.STRIPE_PRODUCT_ID!;
    const productIdRight = import.meta.env.STRIPE_PRODUCT_ID_RIGHT!;

    // Récupérer le prix actif du produit
    const prices = await stripe.prices.list({
      product: tour === "left-bank" ? productIdLeft : productIdRight,
      active: true,
      limit: 1,
    });

    if (!prices.data.length) {
      throw new Error("No active price found for product");
    }

    const activePrice = prices.data[0];

    // Créer une session Stripe Checkout avec le prix du produit
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: activePrice.id, // Utiliser l'ID du prix actif
          quantity: participants,
        },
      ],
      mode: "payment",
      metadata: {
        sessionId,
        participants: participants.toString(),
        customerEmail: email,
        customerName: name,
        tour,
        date,
        time,
        price: price.toString(),
        locale: locale === 'fr' ? 'fr' : 'en',
      },
      locale: locale === 'fr' ? 'fr' : 'en',
      customer_email: email,
      success_url: `${request.headers.get("origin")}${langPrefix}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin")}${langPrefix}/tours/${tour}`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
