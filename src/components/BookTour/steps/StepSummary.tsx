import React, { useState } from "react";
import { useBooking } from "../BookingContext";

interface Props {
  back?: () => void;
  onEditDetails?: () => void;
  onNext?: () => void;
  onRestart?: () => void;
}

const StepSummary: React.FC<Props> = ({ back, onEditDetails, onNext, onRestart }) => {
  const { booking, resetBooking, t, lang } = useBooking();
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const langPrefix = lang === "fr" ? "/fr" : "";

  const handleSubmit = async () => {
    setSending(true);

    if (booking.tourType === "regular") {
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
            price: booking.price,
            locale: lang
          }),
        });

        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || t.summary.errorCheckout);
        }

        const { url } = await res.json();
        if (!url) throw new Error(t.summary.errorNoRedirect);

        window.location.href = url;
      } catch (error) {
        alert(t.summary.errorPayment);
        console.error("Checkout error:", error);
      }
    } else {
      try {
        const bookingRes = await fetch("/api/bookings/private", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: booking.email,
            name: booking.name,
            participants: booking.participants,
            tour: booking.tour,
            date: booking.date,
            time: booking.time,
          }),
        });

        if (!bookingRes.ok) {
          const errData = await bookingRes.json();
          throw new Error(`Error creating private booking: ${errData.error}`);
        }

        const { booking: privateBooking } = await bookingRes.json();

        const response = await fetch("/api/send-booking-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...booking,
            bookingId: privateBooking.id,
            locale: lang
          }),
        });

        const result = await response.json();
        setConfirmed(true);
      } catch (error) {
        console.error("Private booking error:", error);
        alert(t.summary.errorGeneral);
      }
    }

    setSending(false);
  };

  const handleNewBooking = () => {
    setConfirmed(false);
    resetBooking();
    if (onRestart) onRestart();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const tourName = booking.tour === "left-bank" ? t.leftBankTour : t.rightBankTour;
  const participantsLabel = `${booking.participants} ${booking.participants === 1 ? t.person : t.people}`;

  if (confirmed) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          {t.success.title}
        </h3>

        <p className="text-gray-600 mb-6">
          {t.summary.privateConfirmMessage}
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">{t.summary.yourRequestDetails}</h4>
          <div className="space-y-2 text-sm text-left">
            <div className="flex justify-between">
              <span className="text-gray-600">{t.summary.tour}</span>
              <span className="text-gray-900">{tourName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.summary.dateTime}</span>
              <span className="text-gray-900">
                {booking.date && formatDate(booking.date)} {t.calendar.at} {booking.time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.summary.participants}</span>
              <span className="text-gray-900">{participantsLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.summary.contact}</span>
              <span className="text-gray-900">{booking.email}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleNewBooking}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t.summary.makeNewBooking}
          </button>

          <a
            href={`${langPrefix}/`}
            className="block w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            {t.success.returnHome}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-6">
        {t.step6}
      </h3>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="font-medium text-gray-700">{t.summary.tour}</span>
          <span className="text-gray-900">{tourName}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="font-medium text-gray-700">{t.summary.participants}</span>
          <span className="text-gray-900">{participantsLabel}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="font-medium text-gray-700">{t.summary.tourType}</span>
          <span className="text-gray-900">
            {booking.tourType === "regular" ? t.regularTour : t.privateTour}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="font-medium text-gray-700">{t.summary.dateTime}</span>
          <span className="text-gray-900">
            {booking.date && formatDate(booking.date)} {t.calendar.at} {booking.time}
          </span>
        </div>

        {booking.tourType === "regular" && booking.price && (
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="font-medium text-gray-700">{t.summary.totalPrice}</span>
            <span className="text-gray-900 font-semibold">
              €{booking.price}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="font-medium text-gray-700">{t.summary.contact}</span>
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
            ? t.summary.processing
            : booking.tourType === "regular"
              ? t.summary.payNow
              : t.summary.confirm}
        </button>

        <button
          onClick={onEditDetails || back}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm"
        >
          {t.summary.backToDetails}
        </button>
      </div>
    </div>
  );
};

export default StepSummary;
