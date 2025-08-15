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
    console.log('🚀 Starting booking finalization for sessionId:', bookingData.sessionId, 'participants:', bookingData.participants, 'customer:', bookingData.customerEmail);

    // 1. Vérifier la session
    console.debug('🔎 Fetching session from supabase for id:', bookingData.sessionId);
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('available_spots, max_spots, tour_type')
      .eq('id', bookingData.sessionId)
      .single();

    console.debug('📦 Session fetch result:', { session, sessionError });

    if (sessionError || !session) {
      console.error('❌ Session lookup error or not found', { sessionError });
      throw new Error(`Session not found: ${sessionError?.message}`);
    }

    if (session.available_spots < bookingData.participants) {
      console.warn('⚠️ Not enough spots', { available: session.available_spots, requested: bookingData.participants });
      throw new Error(`Not enough available spots. Available: ${session.available_spots}, Requested: ${bookingData.participants}`);
    }

    // 2. Mettre à jour les places disponibles
    const newAvailableSpots = session.available_spots - bookingData.participants;
    console.log(`🔄 Updating spots from ${session.available_spots} to ${newAvailableSpots} for session ${bookingData.sessionId}`);
    
    const { data: updateData, error: updateError } = await supabase
      .from('sessions')
      .update({ available_spots: newAvailableSpots })
      .eq('id', bookingData.sessionId)
      .select();

    console.debug('🔁 Session update result:', { updateData, updateError });

    if (updateError) {
      console.error('❌ Error updating session:', updateError);
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

    console.debug('📝 Inserting booking record:', bookingRecord);
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingRecord)
      .select()
      .single();

    console.debug('✅ Booking insert result:', { booking, bookingError });

    if (bookingError) {
      console.error('❌ Booking insertion failed, rolling back session update', bookingError);
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
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.error('❌ Error sending confirmation email (non-fatal):', emailError);
      // Ne pas faire échouer la réservation si l'email échoue
    }

    console.log('✅ Booking finalized successfully:', booking);
    return { success: true, booking };

  } catch (error) {
    console.error('💥 Error finalizing booking:', error instanceof Error ? error.message : error, { stack: error instanceof Error ? error.stack : undefined });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Fonction pour envoyer l'email de confirmation
function sendConfirmationEmail(bookingData: BookingData, bookingId: string): Promise<void> {
  return (async () => {
    try {
      // Normaliser le payload attendu par /api/send-booking-email
      const payload = {
        // adresse de contact du client
        email: bookingData.customerEmail,
        // nom du client
        name: bookingData.customerName,
        // id de la réservation (local)
        bookingId,
        // type de tour — finalizeBooking est appelé après paiement => regular
        tourType: 'regular',
        // identifiant du tour (left-bank | right-bank)
        tour: bookingData.tour,
        // participants, date, time, price
        participants: bookingData.participants,
        date: bookingData.date,
        time: bookingData.time,
        price: bookingData.price,
        // session id utile pour debug / cross-ref
        sessionId: bookingData.sessionId,
      };

      console.debug('✉️ Sending confirmation email to internal route with payload:', payload);

      // Utiliser la route existante send-booking-email (ne pas changer l'endpoint)
      const response = await fetch('/api/send-booking-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.debug('📬 Email API response status:', response.status);
      const respText = await response.text().catch(() => '<no body>');
      console.debug('📬 Email API response body:', respText);

      if (!response.ok) {
        console.error('❌ Failed to send confirmation email, response:', { status: response.status, body: respText });
        throw new Error('Failed to send confirmation email');
      }
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  })();
}

/**
 * Annule une réservation et remet les places disponibles
 */
export async function cancelBooking(bookingId: string) {
  try {
    console.log('🛑 Cancelling booking id:', bookingId);
    // 1. Récupérer les détails de la réservation
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('session_id, participants_count, status')
      .eq('id', bookingId)
      .single();

    console.debug('🔎 Booking fetch result:', { booking, bookingError });

    if (bookingError || !booking) {
      console.error('❌ Booking not found or error:', bookingError);
      throw new Error('Booking not found');
    }

    if (booking.status === 'cancelled') {
      console.info('ℹ️ Booking already cancelled:', bookingId);
      return { success: true, message: 'Booking already cancelled' };
    }

    // 2. Remettre les places dans la session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('available_spots')
      .eq('id', booking.session_id)
      .single();

    console.debug('🔎 Session fetch for cancellation result:', { session, sessionError });

    if (sessionError || !session) {
      console.error('❌ Session not found while cancelling booking:', sessionError);
      throw new Error('Session not found');
    }

    const newAvailableSpots = session.available_spots + booking.participants_count;
    console.log(`🔄 Restoring spots for session ${booking.session_id}: ${session.available_spots} -> ${newAvailableSpots}`);

    // 3. Mettre à jour la session et la réservation
    const { data: updatedSessionData, error: updateSessionError } = await supabase
      .from('sessions')
      .update({ available_spots: newAvailableSpots })
      .eq('id', booking.session_id)
      .select();

    console.debug('🔁 Session update on cancel result:', { updatedSessionData, updateSessionError });

    if (updateSessionError) {
      console.error('❌ Error updating session during cancel:', updateSessionError);
      throw new Error(`Error updating session: ${updateSessionError.message}`);
    }

    const { data: updatedBookingData, error: updateBookingError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select();

    console.debug('🔁 Booking update on cancel result:', { updatedBookingData, updateBookingError });

    if (updateBookingError) {
      // Rétablir les places si la mise à jour échoue
      console.error('❌ Error cancelling booking, attempting rollback:', updateBookingError);
      await supabase
        .from('sessions')
        .update({ available_spots: session.available_spots })
        .eq('id', booking.session_id);
      
      throw new Error(`Error cancelling booking: ${updateBookingError.message}`);
    }

    console.log('✅ Booking cancelled successfully:', bookingId);
    return { success: true };

  } catch (error) {
    console.error('Error cancelling booking:', error instanceof Error ? error.message : error, { stack: error instanceof Error ? error.stack : undefined });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

