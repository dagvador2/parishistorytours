import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// POST /api/bookings/pay-on-site
// Reserves spots without Stripe payment
// ⚠️ Migration Supabase requise :
// ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';
// ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { sessionId, participants, name, email, phone, tour, date, time, price } = data;

    if (!sessionId || !participants || !name || !email || !tour || !date || !time) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify session and available spots
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('available_spots')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (session.available_spots < participants) {
      return new Response(
        JSON.stringify({ error: 'Not enough spots available' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Decrement available spots
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ available_spots: session.available_spots - participants })
      .eq('id', sessionId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update session' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create booking with status 'confirmed' and payment_method 'on_site'
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        session_id: sessionId,
        customer_name: name,
        customer_email: email,
        participants_count: participants,
        total_price: price || null,
        stripe_payment_intent_id: null,
        tour_type: tour,
        booking_date: date,
        booking_time: time,
        status: 'confirmed',
        payment_method: 'on_site',
        source: 'direct',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      // Rollback: restore spots
      await supabase
        .from('sessions')
        .update({ available_spots: session.available_spots })
        .eq('id', sessionId);

      return new Response(
        JSON.stringify({ error: bookingError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, bookingId: booking.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
