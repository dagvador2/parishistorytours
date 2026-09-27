import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { isAdmin, json, unauthorized } from '../../../lib/admin-auth';
import { sendBookingEmails } from '../../../lib/email';

// POST /api/admin/confirm-private
// Body: { bookingId, paymentMethod: 'on_site' | 'paid', price?: number | null }
//
// Turns a private-tour request into a confirmed booking and sends the
// customer the same confirmation a regular booking gets — address, .ics,
// "what happens next". Until now this step was a hand-written email, and
// nothing downstream (reminder, thank-you) ever fired because the row stayed
// `pending`.

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdmin(cookies)) return unauthorized();

  try {
    const body = await request.json();
    const bookingId = String(body.bookingId ?? '');
    const paymentMethod = body.paymentMethod === 'on_site' ? 'on_site' : 'paid';
    const price = body.price == null || body.price === '' ? null : Number(body.price);

    if (!bookingId) return json({ error: 'bookingId is required' }, 400);
    if (price != null && !Number.isFinite(price)) return json({ error: 'price must be a number' }, 400);

    const { data: booking, error: findError } = await supabase
      .from('bookings')
      .select('id, status, session_id, customer_name, customer_email, customer_phone, customer_message, participants_count, tour_type, booking_date, booking_time, email_locale, tour_language, source')
      .eq('id', bookingId)
      .single();

    if (findError || !booking) return json({ error: 'Booking not found' }, 404);
    if (booking.status !== 'pending') return json({ error: `Booking is ${booking.status}, not pending` }, 409);
    if (!booking.customer_email) return json({ error: 'Booking has no customer email' }, 409);

    // 'manual' records money taken outside Stripe — bank transfer, a payment
    // link sent by hand — so the row never claims a Stripe intent it lacks.
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_method: paymentMethod === 'on_site' ? 'on_site' : 'manual',
        total_price: price,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) return json({ error: updateError.message }, 500);

    const emailResult = await sendBookingEmails({
      email: booking.customer_email,
      name: booking.customer_name ?? '',
      bookingId: booking.id,
      tour: booking.tour_type ?? '',
      tourType: 'private',
      confirmed: true,
      participants: booking.participants_count ?? 1,
      date: booking.booking_date,
      time: booking.booking_time,
      price,
      phone: booking.customer_phone,
      message: booking.customer_message,
      paymentMethod: paymentMethod === 'on_site' ? 'on_site' : 'stripe',
      locale: booking.email_locale ?? 'en',
      tourLanguage: booking.tour_language,
      source: booking.source,
    });

    return json({ success: true, emailSent: emailResult.success, emailError: emailResult.error ?? null });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
};
