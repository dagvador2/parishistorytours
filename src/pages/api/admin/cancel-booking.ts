import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { cancelBooking } from '../../../lib/booking';
import { isAdmin, json, unauthorized } from '../../../lib/admin-auth';

// POST /api/admin/cancel-booking — Body: { bookingId }
//
// A session booking goes through cancelBooking(), which hands the spots back.
// A private request or confirmed private tour has no session, so it is simply
// marked cancelled. No email is sent either way: declining someone is a
// message Clément writes himself.

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdmin(cookies)) return unauthorized();

  try {
    const { bookingId } = await request.json();
    if (!bookingId) return json({ error: 'bookingId is required' }, 400);

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, session_id, status')
      .eq('id', bookingId)
      .single();
    if (error || !booking) return json({ error: 'Booking not found' }, 404);
    if (booking.status === 'cancelled') return json({ success: true, already: true });

    if (booking.session_id) {
      const result = await cancelBooking(bookingId);
      if (!result.success) return json({ error: result.error ?? 'Cancellation failed' }, 500);
      return json({ success: true });
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', bookingId);
    if (updateError) return json({ error: updateError.message }, 500);
    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
};
