import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const bookingData = await request.json();

    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert({
        tour: bookingData.tour,
        participants: bookingData.participants || 1,
        tour_type: bookingData.tourType || 'private',
        date_booking: bookingData.date,
        time_booking: bookingData.time,
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone || null
      })
      .select()
      .single();

    if (dbError) {
      console.error('Booking DB error:', dbError.code);
      return new Response(JSON.stringify({
        error: 'Failed to save booking'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      bookingId: booking.id,
      message: 'Booking saved successfully!'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Booking error:', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({
      error: 'Server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
