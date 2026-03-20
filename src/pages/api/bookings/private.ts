import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, name, participants, tour, date, time } = body;

    if (!email || !name || !participants || !tour || !date || !time) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: privateBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        session_id: null,
        customer_email: email,
        customer_name: name,
        participants_count: participants,
        total_price: null,
        stripe_payment_intent_id: null,
        tour_type: tour,
        booking_date: date,
        booking_time: time,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      return new Response(JSON.stringify({ error: bookingError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ booking: privateBooking }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
