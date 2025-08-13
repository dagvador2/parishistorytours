import React, { useState } from "react";
import { useBooking } from "../BookingContext";
import { supabase } from "../../../lib/supabase";

interface Props {
  back?: () => void;
  onEditDetails?: () => void;
  onNext?: () => void;
  onRestart?: () => void; // Nouvelle prop pour redémarrer
}

const StepSummary: React.FC<Props> = ({ back, onEditDetails, onNext, onRestart }) => {
  const { booking, resetBooking } = useBooking();
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async () => {
    console.log('StepSummary handleSubmit called');
    console.log('booking.tourType:', booking.tourType);
    
    setSending(true);

    if (booking.tourType === "regular") {
      // Pour les tours réguliers : rediriger vers Stripe Checkout
      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: booking.sessionId,
            participants: booking.participants,
            email: booking.email,
            name: booking.name,
            tour: booking.tour,
            date: booking.date,
            time: booking.time,
            price: booking.price
          }),
        });

        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || "Failed to create checkout session.");
        }

        const { url } = await res.json();
        if (!url) {
          throw new Error("No redirect URL provided.");
        }

        window.location.href = url; // Redirection vers Stripe Checkout
      } catch (error) {
        alert("Failed to process payment. Please try again.");
        console.error("Checkout error:", error);
      }
    } else {
      // Pour les tours privés : enregistrer en base ET envoyer email
      try {
        // 1. Enregistrer la demande de tour privé en base
        const { data: privateBooking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            session_id: null, // Pas de session pour les tours privés
            customer_email: booking.email,
            customer_name: booking.name,
            participants_count: booking.participants,
            total_price: null, // Prix à déterminer
            stripe_payment_intent_id: null, // Pas de paiement immédiat
            tour_type: booking.tour,
            booking_date: booking.date,
            booking_time: booking.time,
            status: 'pending', // Statut en attente
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (bookingError) {
          throw new Error(`Error creating private booking: ${bookingError.message}`);
        }

        // 2. Envoyer email de demande
        const response = await fetch("/api/send-booking-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...booking,
            bookingId: privateBooking.id // Ajouter l'ID de la réservation
          }),
        });

        const result = await response.json();

        // 3. Afficher la confirmation au lieu de l'alert
        setConfirmed(true);

      } catch (error) {
        console.error("Private booking error:", error);
        alert(
          "There was an error processing your request. Please try again or contact us directly."
        );
      }
    }

    setSending(false);
  };

  const handleNewBooking = () => {
    setConfirmed(false);
    resetBooking(); // Réinitialiser les données de réservation
    if (onRestart) {
      onRestart(); // Retourner au step 1
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Affichage de confirmation
  if (confirmed) {
    return (
      <div className="text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        {/* Success Message */}
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Request Confirmed!
        </h3>
        
        <p className="text-gray-600 mb-6">
          Thank you for your private tour request! We've sent you a confirmation email and will contact you within 24 hours to confirm availability and payment details.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Your Request Details</h4>
          <div className="space-y-2 text-sm text-left">
            <div className="flex justify-between">
              <span className="text-gray-600">Tour:</span>
              <span className="text-gray-900">
                {booking.tour === "left-bank" ? "Left Bank Tour" : "Right Bank Tour"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date & Time:</span>
              <span className="text-gray-900">
                {booking.date && formatDate(booking.date)} at {booking.time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Participants:</span>
              <span className="text-gray-900">
                {booking.participants} {booking.participants === 1 ? "person" : "people"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contact:</span>
              <span className="text-gray-900">{booking.email}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleNewBooking}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Make New Booking
          </button>
          
          <a 
            href="/"
            className="block w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // Affichage normal du summary
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-6">
        Step 6: Booking Summary
      </h3>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="font-medium text-gray-700">Tour:</span>
          <span className="text-gray-900">
            {booking.tour === "left-bank"
              ? "Left Bank Tour"
              : "Right Bank Tour"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="font-medium text-gray-700">Participants:</span>
          <span className="text-gray-900">
            {booking.participants}{" "}
            {booking.participants === 1 ? "person" : "people"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="font-medium text-gray-700">Tour Type:</span>
          <span className="text-gray-900">
            {booking.tourType === "regular" ? "Regular Tour" : "Private Tour"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="font-medium text-gray-700">Date & Time:</span>
          <span className="text-gray-900">
            {booking.date && formatDate(booking.date)} at {booking.time}
          </span>
        </div>

        {booking.tourType === "regular" && booking.price && (
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="font-medium text-gray-700">Total Price:</span>
            <span className="text-gray-900 font-semibold">
              €{booking.price}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="font-medium text-gray-700">Contact:</span>
          <span className="text-gray-900">
            {booking.name} ({booking.email})
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={sending}
          className="px-4 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm md:text-base w-40"
        >
          {sending
            ? "Processing..."
            : booking.tourType === "regular"
              ? "Pay Now"
              : "Confirm"}
        </button>

        <button
          onClick={onEditDetails || back}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm"
        >
          ← Back to details
        </button>
      </div>
    </div>
  );
};

export default StepSummary;
