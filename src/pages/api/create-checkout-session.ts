import type { APIRoute } from "astro";
import Stripe from "stripe";
import { fetchActivePrice, isTourSlug } from "../../lib/stripe-products";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { sessionId, participants, email, name, tour, date, time, price, locale } =
      await request.json();
    const langPrefix = locale === 'fr' ? '/fr' : '';

    if (!isTourSlug(tour)) {
      return new Response(
        JSON.stringify({ error: `Invalid tour: ${tour}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const activePrice = await fetchActivePrice(tour);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: activePrice.id,
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
