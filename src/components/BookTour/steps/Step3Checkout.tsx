import React, { useState } from "react";
import { useBooking } from "../BookingContext";
import type { PaymentMethod } from "../types";

interface Props {
  onBack?: () => void;
  onRestart?: () => void;
}

const Step3Checkout: React.FC<Props> = ({ onBack, onRestart }) => {
  const { booking, setBooking, resetBooking, t, lang } = useBooking();
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const langPrefix = lang === "fr" ? "/fr" : "";

  const updateName = (value: string) => setBooking({ ...booking, name: value });
  const updateEmail = (value: string) => setBooking({ ...booking, email: value });
  const updatePhone = (value: string) => setBooking({ ...booking, phone: value });

  const isContactValid = booking.name?.trim() && booking.email?.trim();

  const handleSubmit = async () => {
    if (!isContactValid) return;
    setSending(true);

    if (booking.tourType === "regular" && paymentMethod === "stripe") {
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
            locale: lang,
          }),
        });
        if (!res.ok) throw new Error(await res.text() || t.summary.errorCheckout);
        const { url } = await res.json();
        if (!url) throw new Error(t.summary.errorNoRedirect);
        window.location.href = url;
      } catch (error) {
        alert(t.summary.errorPayment);
        console.error("Checkout error:", error);
        setSending(false);
      }
    } else if (booking.tourType === "regular" && paymentMethod === "on_site") {
      try {
        const res = await fetch("/api/bookings/pay-on-site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: booking.sessionId,
            participants: booking.participants,
            name: booking.name,
            email: booking.email,
            phone: booking.phone || null,
            tour: booking.tour,
            date: booking.date,
            time: booking.time,
            price: booking.price,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Booking failed");
        }
        const { bookingId } = await res.json();
        await fetch("/api/send-booking-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...booking, bookingId, paymentMethod: "on_site", locale: lang }),
        });
        setConfirmed(true);
      } catch (error) {
        console.error("On-site booking error:", error);
        alert(t.summary.errorGeneral);
      }
      setSending(false);
    } else {
      try {
        const bookingRes = await fetch("/api/bookings/private", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: booking.email, name: booking.name, participants: booking.participants,
            tour: booking.tour, date: booking.date, time: booking.time, message: booking.message || null,
          }),
        });
        if (!bookingRes.ok) {
          const errData = await bookingRes.json();
          throw new Error(errData.error || "Private booking failed");
        }
        const { booking: privateBooking } = await bookingRes.json();
        await fetch("/api/send-booking-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...booking, bookingId: privateBooking.id, locale: lang }),
        });
        setConfirmed(true);
      } catch (error) {
        console.error("Private booking error:", error);
        alert(t.summary.errorGeneral);
      }
      setSending(false);
    }
  };

  const handleNewBooking = () => {
    setConfirmed(false);
    resetBooking();
    if (onRestart) onRestart();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  };

  const tourName = booking.tour === "left-bank" ? t.leftBankTour : t.rightBankTour;
  const participantsLabel = `${booking.participants} ${booking.participants === 1 ? t.person : t.people}`;

  // --- Confirmed state ---
  if (confirmed) {
    const isOnSite = paymentMethod === "on_site" && booking.tourType === "regular";
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">{t.success.title}</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {isOnSite ? t.checkout.onSiteConfirmMessage : booking.tourType === "private" ? t.summary.privateConfirmMessage : t.success.message}
          </p>
          <div className="bg-gray-50 rounded-xl p-5 mb-6 max-w-sm mx-auto">
            <h4 className="font-bold text-gray-800 mb-3">{t.summary.yourRequestDetails}</h4>
            <div className="space-y-2 text-sm text-left">
              <div className="flex justify-between"><span className="text-gray-500">{t.summary.tour}</span><span className="text-gray-900 font-medium">{tourName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t.summary.dateTime}</span><span className="text-gray-900">{booking.date && formatDate(booking.date)} {t.calendar.at} {booking.time}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t.summary.participants}</span><span className="text-gray-900">{participantsLabel}</span></div>
              {booking.price && (
                <div className="flex justify-between"><span className="text-gray-500">{t.summary.totalPrice}</span><span className="text-gray-900 font-bold">€{booking.price}{isOnSite && <span className="text-xs font-normal text-gray-400 ml-1">({t.checkout.payOnSiteLabel})</span>}</span></div>
              )}
            </div>
          </div>
          <div className="space-y-3 max-w-sm mx-auto">
            <button onClick={handleNewBooking} className="w-full py-3 px-4 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors font-semibold shadow-md">{t.summary.makeNewBooking}</button>
            <a href={`${langPrefix}/`} className="block w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium">{t.success.returnHome}</a>
          </div>
        </div>
      </div>
    );
  }

  // --- Checkout form ---
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
      {/* Summary recap at top */}
      <div className="bg-gray-50 rounded-xl p-5 mb-8">
        <h4 className="text-base font-bold text-gray-800 mb-3 text-center">
          {t.checkout.summaryTitle}
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm max-w-md mx-auto">
          <span className="text-gray-500">{t.summary.tour}</span>
          <span className="text-gray-900 font-medium text-right">{tourName}</span>
          <span className="text-gray-500">{t.summary.dateTime}</span>
          <span className="text-gray-900 text-right">{booking.date && formatDate(booking.date)}<br />{t.calendar.at} {booking.time}</span>
          <span className="text-gray-500">{t.summary.participants}</span>
          <span className="text-gray-900 text-right">{participantsLabel}</span>
          <span className="text-gray-500">{t.summary.tourType}</span>
          <span className="text-gray-900 text-right">{booking.tourType === "regular" ? t.regularTour : t.privateTour}</span>
          {booking.tourType === "regular" && booking.price && (
            <>
              <span className="text-gray-800 font-bold pt-2 border-t border-gray-200">{t.summary.totalPrice}</span>
              <span className="text-gray-900 text-xl font-bold text-right pt-2 border-t border-gray-200">€{booking.price}</span>
            </>
          )}
        </div>
      </div>

      {/* Contact form */}
      <h3 className="text-lg font-bold text-gray-800 mb-5 text-center">
        {t.checkout.contactTitle}
      </h3>
      <div className="space-y-4 mb-8 max-w-md mx-auto">
        <div>
          <label htmlFor="checkout-name" className="block text-sm font-semibold text-gray-700 mb-1">{t.contact.name}</label>
          <input type="text" id="checkout-name" required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-gray-800 focus:outline-none transition-colors" placeholder={t.contact.namePlaceholder} value={booking.name || ""} onChange={(e) => updateName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="checkout-email" className="block text-sm font-semibold text-gray-700 mb-1">{t.contact.email}</label>
          <input type="email" id="checkout-email" required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-gray-800 focus:outline-none transition-colors" placeholder={t.contact.emailPlaceholder} value={booking.email || ""} onChange={(e) => updateEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="checkout-phone" className="block text-sm font-semibold text-gray-700 mb-1">{t.contact.phone}</label>
          <input type="tel" id="checkout-phone" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-gray-800 focus:outline-none transition-colors" placeholder={t.contact.phonePlaceholder} value={booking.phone || ""} onChange={(e) => updatePhone(e.target.value)} />
        </div>
      </div>

      {/* Payment method (Regular only) */}
      {booking.tourType === "regular" && (
        <div className="mb-8 max-w-md mx-auto">
          <h4 className="text-lg font-bold text-gray-800 mb-4 text-center">
            {t.checkout.paymentTitle}
          </h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("stripe")}
              className={`flex-1 p-4 border-2 rounded-xl text-center transition-all duration-200 ${
                paymentMethod === "stripe"
                  ? "border-gray-800 bg-blue-50 shadow-md shadow-blue-100"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className={`font-bold ${paymentMethod === "stripe" ? "text-blue-700" : "text-gray-800"}`}>{t.checkout.payOnline}</div>
              <p className="text-sm text-gray-500 mt-1">{t.checkout.payOnlineDesc}</p>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("on_site")}
              className={`flex-1 p-4 border-2 rounded-xl text-center transition-all duration-200 ${
                paymentMethod === "on_site"
                  ? "border-gray-800 bg-blue-50 shadow-md shadow-blue-100"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className={`font-bold ${paymentMethod === "on_site" ? "text-blue-700" : "text-gray-800"}`}>{t.checkout.payOnSite}</div>
              <p className="text-sm text-gray-500 mt-1">{t.checkout.payOnSiteDesc}</p>
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
        <button
          onClick={handleSubmit}
          disabled={sending || !isContactValid}
          className="w-full px-6 py-3.5 rounded-xl font-bold bg-gray-800 text-white hover:bg-gray-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-base"
        >
          {sending
            ? t.summary.processing
            : booking.tourType === "private"
            ? t.checkout.sendRequest
            : paymentMethod === "stripe"
            ? `${t.checkout.payNowBtn} — €${booking.price || 0}`
            : `${t.checkout.reserveBtn} — €${booking.price || 0} ${t.checkout.payOnSiteLabel}`}
        </button>

        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
        >
          {t.checkout.modify}
        </button>
      </div>

      {!isContactValid && (
        <p className="text-sm text-red-500 text-center mt-3">{t.validation.fillContact}</p>
      )}
    </div>
  );
};

export default Step3Checkout;
