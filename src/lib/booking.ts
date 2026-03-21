import { supabase } from './supabase';

export interface BookingData {
  sessionId: string;
  participants: number;
  customerEmail: string;
  customerName: string;
  stripePaymentIntentId: string;
  tour: string;
  date: string;
  time: string;
  price: number;
}

/**
 * Finalise une réservation après paiement réussi
 */
export async function finalizeBooking(bookingData: BookingData) {
  try {
    // 1. Vérifier la session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('available_spots, max_spots, tour_type')
      .eq('id', bookingData.sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session lookup error:', sessionError?.code);
      throw new Error(`Session not found: ${sessionError?.message}`);
    }

    if (session.available_spots < bookingData.participants) {
      throw new Error(`Not enough available spots. Available: ${session.available_spots}, Requested: ${bookingData.participants}`);
    }

    // 2. Mettre à jour les places disponibles
    const newAvailableSpots = session.available_spots - bookingData.participants;

    const { error: updateError } = await supabase
      .from('sessions')
      .update({ available_spots: newAvailableSpots })
      .eq('id', bookingData.sessionId)
      .select();

    if (updateError) {
      console.error('Session update error:', updateError.code);
      throw new Error(`Error updating session: ${updateError.message}`);
    }

    // 3. Enregistrer la réservation
    const bookingRecord = {
      session_id: bookingData.sessionId,
      customer_email: bookingData.customerEmail,
      customer_name: bookingData.customerName,
      participants_count: bookingData.participants,
      total_price: bookingData.price,
      stripe_payment_intent_id: bookingData.stripePaymentIntentId,
      tour_type: bookingData.tour,
      booking_date: bookingData.date,
      booking_time: bookingData.time,
      status: 'confirmed',
      created_at: new Date().toISOString()
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingRecord)
      .select()
      .single();

    if (bookingError) {
      console.error('Booking insertion failed, rolling back:', bookingError.code);
      // Rétablir les places en cas d'erreur
      await supabase
        .from('sessions')
        .update({ available_spots: session.available_spots })
        .eq('id', bookingData.sessionId);

      throw new Error(`Error creating booking: ${bookingError.message}`);
    }

    // 4. Envoyer l'email de confirmation
    try {
      await sendConfirmationEmail(bookingData, booking.id);
    } catch (emailError) {
      console.error('Confirmation email failed (non-fatal):', emailError instanceof Error ? emailError.message : emailError);
    }

    return { success: true, booking };

  } catch (error) {
    console.error('Booking finalization error:', error instanceof Error ? error.message : error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Fonction pour envoyer l'email de confirmation
function sendConfirmationEmail(bookingData: BookingData, bookingId: string): Promise<void> {
  return (async () => {
    const payload = {
      email: bookingData.customerEmail,
      name: bookingData.customerName,
      bookingId,
      tourType: 'regular',
      tour: bookingData.tour,
      participants: bookingData.participants,
      date: bookingData.date,
      time: bookingData.time,
      price: bookingData.price,
      sessionId: bookingData.sessionId,
    };

    // Construire l'URL absolue pour la route d'email
    const baseUrl = process.env.SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.parishistorytours.com');
    const emailUrl = `${baseUrl}/api/send-booking-email`;

    const response = await fetch(emailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Email API returned ${response.status}`);
    }
  })();
}

/**
 * Annule une réservation et remet les places disponibles
 */
export async function cancelBooking(bookingId: string) {
  try {
    // 1. Récupérer les détails de la réservation
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('session_id, participants_count, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError?.code);
      throw new Error('Booking not found');
    }

    if (booking.status === 'cancelled') {
      return { success: true, message: 'Booking already cancelled' };
    }

    // 2. Remettre les places dans la session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('available_spots')
      .eq('id', booking.session_id)
      .single();

    if (sessionError || !session) {
      console.error('Session not found for cancellation:', sessionError?.code);
      throw new Error('Session not found');
    }

    const newAvailableSpots = session.available_spots + booking.participants_count;

    // 3. Mettre à jour la session et la réservation
    const { error: updateSessionError } = await supabase
      .from('sessions')
      .update({ available_spots: newAvailableSpots })
      .eq('id', booking.session_id)
      .select();

    if (updateSessionError) {
      console.error('Session update error during cancel:', updateSessionError.code);
      throw new Error(`Error updating session: ${updateSessionError.message}`);
    }

    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select();

    if (updateBookingError) {
      console.error('Cancel error, rolling back:', updateBookingError.code);
      await supabase
        .from('sessions')
        .update({ available_spots: session.available_spots })
        .eq('id', booking.session_id);

      throw new Error(`Error cancelling booking: ${updateBookingError.message}`);
    }

    return { success: true };

  } catch (error) {
    console.error('Cancel booking error:', error instanceof Error ? error.message : error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
