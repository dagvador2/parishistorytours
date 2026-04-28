import type { APIRoute } from "astro";
import Stripe from "stripe";
import { finalizeBooking } from "../../lib/booking";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed");
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // Traiter l'événement
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const metadata = session.metadata;

      if (!metadata) {
        throw new Error("No metadata found in session");
      }

      // Finaliser la réservation
      const result = await finalizeBooking({
        sessionId: metadata.sessionId,
        participants: parseInt(metadata.participants),
        customerEmail: metadata.customerEmail,
        customerName: metadata.customerName,
        stripePaymentIntentId: session.payment_intent as string,
        tour: metadata.tour,
        date: metadata.date,
        time: metadata.time,
        price: parseFloat(metadata.price),
        locale: metadata.locale,
      });

      if (!result.success) {
        console.error("Booking finalization failed:", result.error);
      } else if (result.emailResult && !result.emailResult.success) {
        console.error("Booking saved but confirmation email failed:", result.emailResult.error, "bookingId=", result.booking?.id);
      }
    } catch (error) {
      console.error("Error processing payment:", error instanceof Error ? error.message : error);
      return new Response("Error processing payment", { status: 500 });
    }
  }

  return new Response("Success", { status: 200 });
};
