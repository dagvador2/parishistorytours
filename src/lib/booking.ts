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
    console.log('🚀 Starting booking finalization for:', bookingData.sessionId);

    // 1. Vérifier la session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('available_spots, max_spots, tour_type')
      .eq('id', bookingData.sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionError?.message}`);
    }

    if (session.available_spots < bookingData.participants) {
      throw new Error(`Not enough available spots. Available: ${session.available_spots}, Requested: ${bookingData.participants}`);
    }

    // 2. Mettre à jour les places disponibles
    const newAvailableSpots = session.available_spots - bookingData.participants;
    console.log(`🔄 Updating spots from ${session.available_spots} to ${newAvailableSpots}`);
    
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ available_spots: newAvailableSpots })
      .eq('id', bookingData.sessionId);

    if (updateError) {
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
      console.error('❌ Error sending confirmation email:', emailError);
      // Ne pas faire échouer la réservation si l'email échoue
    }

    console.log('✅ Booking finalized successfully:', booking);
    return { success: true, booking };

  } catch (error) {
    console.error('💥 Error finalizing booking:', error);
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
      const response = await fetch('/api/send-confirmation-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          customerEmail: bookingData.customerEmail,
          customerName: bookingData.customerName,
          tour: bookingData.tour,
          date: bookingData.date,
          time: bookingData.time,
          participants: bookingData.participants,
          price: bookingData.price
        }),
      });

      if (!response.ok) {
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
    // 1. Récupérer les détails de la réservation
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('session_id, participants_count, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
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
      throw new Error('Session not found');
    }

    const newAvailableSpots = session.available_spots + booking.participants_count;

    // 3. Mettre à jour la session et la réservation
    const { error: updateSessionError } = await supabase
      .from('sessions')
      .update({ available_spots: newAvailableSpots })
      .eq('id', booking.session_id);

    if (updateSessionError) {
      throw new Error(`Error updating session: ${updateSessionError.message}`);
    }

    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateBookingError) {
      // Rétablir les places si la mise à jour échoue
      await supabase
        .from('sessions')
        .update({ available_spots: session.available_spots })
        .eq('id', booking.session_id);
      
      throw new Error(`Error cancelling booking: ${updateBookingError.message}`);
    }

    return { success: true };

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

