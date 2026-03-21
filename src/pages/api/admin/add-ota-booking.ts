import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// ⚠️ Supabase migrations needed (DO NOT execute automatically):
// ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
// ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ota_reference TEXT;
// ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verify admin auth via cookie
  const adminToken = cookies.get('admin_token')?.value;
  if (!adminToken || adminToken !== import.meta.env.ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { sessionId, participants, source, customerName, otaReference, tour } = await request.json();

    if (!sessionId || !participants || !source) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (sessionId, participants, source)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify session and available spots
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('available_spots, start_time, tour_type')
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
        JSON.stringify({ error: `Not enough spots. Available: ${session.available_spots}, Requested: ${participants}` }),
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

    // 3. Create the OTA booking record
    const bookingDate = new Date(session.start_time).toISOString().split('T')[0];
    const bookingTime = new Date(session.start_time).toTimeString().split(' ')[0].substring(0, 5);

    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        session_id: sessionId,
        customer_name: customerName || `OTA ${source}`,
        customer_email: null,
        participants_count: participants,
        total_price: null,
        stripe_payment_intent_id: null,
        tour_type: tour || session.tour_type,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: 'confirmed',
        source: source,
        ota_reference: otaReference || null,
        payment_method: null,
        created_at: new Date().toISOString(),
      });

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
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
