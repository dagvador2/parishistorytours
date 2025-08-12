import React, { useState } from "react";
import { useBooking } from "../BookingContext";

interface Props {
  back?: () => void;
  onEditDetails?: () => void;
  onNext?: () => void;
}

const StepSummary: React.FC<Props> = ({ back, onEditDetails, onNext }) => {
  const { booking } = useBooking();
  const [sending, setSending] = useState(false);

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
      // Pour les tours privés : envoyer email de demande
      try {
        const response = await fetch("/api/send-booking-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(booking),
        });

        const result = await response.json();

        if (result.success) {
          alert(
            "Thank you for your private tour request! We've sent you a confirmation email and will contact you within 24 hours to confirm availability and payment details."
          );
        } else {
          throw new Error(result.error || "Failed to send email");
        }
      } catch (error) {
        alert(
          "Your request has been received, but we couldn't send a confirmation email. We'll contact you directly within 24 hours."
        );
        console.error("Email error:", error);
      }
    }

    setSending(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
