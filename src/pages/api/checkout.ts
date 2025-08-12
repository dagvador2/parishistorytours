import type { APIRoute } from "astro";
import Stripe from "stripe";
import { supabaseServer } from "../../lib/supabase-server";
import { fetchActivePrice } from "./stripe-price";

// Ensure this runs as a server endpoint, not prerendered
export const prerender = false;

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { sessionId, participants, email, name, phone } = await request.json();

    console.log("Checking availability for:", { sessionId, participants });

    // 1. Vérifier la disponibilité en temps réel
    const { data: session, error: sessionError } = await supabaseServer
      .from("sessions")
      .select("id, available_spots, max_spots, tour_type, start_time")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("Session fetch error:", sessionError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Session not found",
          details: sessionError.message,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Session found:", session);

    // Vérifier la disponibilité
    if (session.available_spots < participants) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Not enough available spots",
          available: session.available_spots,
          requested: participants,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. draft booking (status=pending)
    const { data: booking, error: bookingError } = await supabaseServer
      .from("bookings")
      .insert({
        slot_id: sessionId,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        participants,
        total_amount_cents: participants * 5000,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error("Error creating booking:", bookingError);
      return new Response("Failed to create booking", { status: 500 });
    }

    // 3. Fetch the latest price for the product
    const price = await fetchActivePrice();

    // 4. Create Stripe Checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: price.id, // Dynamically fetched price ID
          quantity: participants,
        },
      ],
      mode: "payment",
      metadata: { booking_id: booking.id, slot_id: sessionId },
      customer_email: email,
      success_url: `${request.headers.get("origin")}/success?bid=${booking.id}`,
      cancel_url: `${request.headers.get("origin")}/tours/${session.tour_type}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: stripeSession.url,
        session: {
          id: session.id,
          available_spots: session.available_spots,
          tour_type: session.tour_type,
          start_time: session.start_time,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Checkout validation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/* 
// The following code block was removed due to duplicate APIRoute and POST handler.
// If you need this logic, move it to a separate API route file.
*/
