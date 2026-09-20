import React, { useState, useEffect } from "react";
import { useBooking } from "../BookingContext";
import { getTourName } from "../../../data/tour-info";
import { track } from "../../../scripts/track";
import type { PaymentMethod } from "../types";

interface Props {
  onBack: () => void;
  onRestart: () => void;
}

const r2: React.CSSProperties = { borderRadius: 2 };
const display: React.CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 500 };

const inputClass =
  "w-full border border-[var(--border)] bg-[var(--paper-3)] px-4 py-3 text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none transition-colors";

const RegularCheckout: React.FC<Props> = ({ onBack, onRestart }) => {
  const { booking, setBooking, resetBooking, t, lang } = useBooking();
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [submitError, setSubmitError] = useState("");

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const langPrefix = lang === "fr" ? "/fr" : "";

  useEffect(() => {
    track("begin_checkout", { mode: "regular", tour: booking.tour });
  }, []);

  const updateField = (field: string, value: string) =>
    setBooking({ ...booking, [field]: value });

  const isContactValid = booking.name?.trim() && booking.email?.trim();

  const tourName = getTourName(booking.tour, lang);
  const participantsLabel = `${booking.participants} ${booking.participants === 1 ? t.person : t.people}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const handleSubmit = async () => {
    if (!isContactValid) return;
    setSending(true);
    setSubmitError("");
    track("checkout_submit", { mode: "regular", method: paymentMethod, tour: booking.tour });

    if (paymentMethod === "stripe") {
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
        if (!res.ok) throw new Error((await res.text()) || t.summary.errorCheckout);
        const { url } = await res.json();
        if (!url) throw new Error(t.summary.errorNoRedirect);
        window.location.href = url;
      } catch (error) {
        setSubmitError(t.summary.errorPayment);
        console.error("Checkout error:", error);
        setSending(false);
      }
    } else {
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
          body: JSON.stringify({
            ...booking,
            bookingId,
            paymentMethod: "on_site",
            locale: lang,
          }),
        });
        track("booking_confirmed", { mode: "regular", method: "on_site", tour: booking.tour });
        setConfirmed(true);
      } catch (error) {
        console.error("On-site booking error:", error);
        setSubmitError(t.summary.errorGeneral);
      }
      setSending(false);
    }
  };

  const handleNewBooking = () => {
    setConfirmed(false);
    resetBooking();
    onRestart();
  };

  // --- Confirmed state ---
  if (confirmed) {
    const isOnSite = paymentMethod === "on_site";
    return (
      <div
        className="bg-[var(--paper-3)] border border-[var(--border)] p-8"
        style={{ ...r2, fontFamily: "var(--font-sans)" }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 border border-[var(--ink)] rounded-full flex items-center justify-center text-[var(--ink)]">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl text-[var(--ink)] mb-4" style={display}>{t.success.title}</h3>
          <p className="text-[var(--ink-2)] mb-6 max-w-md mx-auto">
            {isOnSite ? t.checkout.onSiteConfirmMessage : t.success.message}
          </p>
          <div className="bg-[var(--paper-2)] border border-[var(--border)] p-5 mb-6 max-w-sm mx-auto" style={r2}>
            <h4 className="text-[var(--ink)] font-medium mb-3">{t.summary.yourRequestDetails}</h4>
            <div className="space-y-2 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-[var(--ink-2)]">{t.summary.tour}</span>
                <span className="text-[var(--ink)] font-medium">{tourName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-2)]">{t.summary.dateTime}</span>
                <span className="text-[var(--ink)] text-right">
                  {booking.date && formatDate(booking.date)} {t.calendar.at} {booking.time}
                  <span className="block text-xs text-[var(--ink-2)]">
                    {t.upcoming?.parisTime || "All times are Paris time (CET/CEST)."}
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-2)]">{t.summary.participants}</span>
                <span className="text-[var(--ink)]">{participantsLabel}</span>
              </div>
              {booking.price && (
                <div className="flex justify-between">
                  <span className="text-[var(--ink-2)]">{t.summary.totalPrice}</span>
                  <span className="text-[var(--ink)] font-semibold">
                    €{booking.price}
                    {isOnSite && (
                      <span className="text-xs font-normal text-[var(--ink-2)] ml-1">
                        ({t.checkout.payOnSiteLabel})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3 max-w-sm mx-auto">
            <button
              onClick={handleNewBooking}
              className="w-full py-3 px-4 bg-[var(--ink)] text-[var(--paper-3)] border border-[var(--ink)] hover:bg-[var(--rouge)] hover:border-[var(--rouge)] transition-colors font-medium cursor-pointer"
              style={r2}
            >
              {t.summary.makeNewBooking}
            </button>
            <a
              href={`${langPrefix}/`}
              className="block w-full py-3 px-4 border border-[var(--border)] text-[var(--ink-2)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors font-medium"
              style={r2}
            >
              {t.success.returnHome}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --- Checkout form ---
  return (
    <div
      className="bg-[var(--paper-3)] border border-[var(--border)] p-6 md:p-8"
      style={{ ...r2, fontFamily: "var(--font-sans)" }}
    >
      {/* Summary recap */}
      <div className="bg-[var(--paper-2)] border border-[var(--border)] p-5 mb-8" style={r2}>
        <h4 className="text-base text-[var(--ink)] mb-3 text-center" style={display}>
          {t.checkout.summaryTitle}
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm max-w-md mx-auto">
          <span className="text-[var(--ink-2)]">{t.summary.tour}</span>
          <span className="text-[var(--ink)] font-medium text-right">{tourName}</span>
          <span className="text-[var(--ink-2)]">{t.summary.dateTime}</span>
          <span className="text-[var(--ink)] text-right">
            {booking.date && formatDate(booking.date)}
            <br />
            {t.calendar.at} {booking.time}
            <span className="block text-xs text-[var(--ink-2)]">
              {t.upcoming?.parisTime || "All times are Paris time (CET/CEST)."}
            </span>
          </span>
          <span className="text-[var(--ink-2)]">{t.summary.participants}</span>
          <span className="text-[var(--ink)] text-right">{participantsLabel}</span>
          {booking.price && (
            <>
              <span className="text-[var(--ink)] font-semibold pt-2 border-t border-[var(--border)]">
                {t.summary.totalPrice}
              </span>
              <span className="text-[var(--ink)] text-xl text-right pt-2 border-t border-[var(--border)]" style={display}>
                €{booking.price}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Contact form */}
      <h3 className="text-lg text-[var(--ink)] mb-5 text-center" style={display}>
        {t.checkout.contactTitle}
      </h3>
      <div className="space-y-4 mb-8 max-w-md mx-auto">
        <div>
          <label htmlFor="checkout-name" className="block text-sm font-medium text-[var(--ink)] mb-1">
            {t.contact.name}
          </label>
          <input
            type="text"
            id="checkout-name"
            required
            className={inputClass}
            style={r2}
            placeholder={t.contact.namePlaceholder}
            value={booking.name || ""}
            onChange={(e) => updateField("name", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="checkout-email" className="block text-sm font-medium text-[var(--ink)] mb-1">
            {t.contact.email}
          </label>
          <input
            type="email"
            id="checkout-email"
            required
            className={inputClass}
            style={r2}
            placeholder={t.contact.emailPlaceholder}
            value={booking.email || ""}
            onChange={(e) => updateField("email", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="checkout-phone" className="block text-sm font-medium text-[var(--ink)] mb-1">
            {t.contact.phone}
          </label>
          <input
            type="tel"
            id="checkout-phone"
            className={inputClass}
            style={r2}
            placeholder={t.contact.phonePlaceholder}
            value={booking.phone || ""}
            onChange={(e) => updateField("phone", e.target.value)}
          />
        </div>
      </div>

      {/* Payment method */}
      <div className="mb-8 max-w-md mx-auto">
        <h4 className="text-lg text-[var(--ink)] mb-4 text-center" style={display}>
          {t.checkout.paymentTitle}
        </h4>
        <div className="flex flex-col sm:flex-row gap-3">
          {(["stripe", "on_site"] as PaymentMethod[]).map((method) => {
            const isActive = paymentMethod === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 p-4 border text-center transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? "border-[var(--ink)] bg-[var(--paper-2)]"
                    : "border-[var(--border)] hover:border-[var(--ink)]"
                }`}
                style={r2}
              >
                <div className="font-medium text-[var(--ink)]">
                  {method === "stripe" ? t.checkout.payOnline : t.checkout.payOnSite}
                </div>
                <p className="text-sm text-[var(--ink-2)] mt-1">
                  {method === "stripe" ? t.checkout.payOnlineDesc : t.checkout.payOnSiteDesc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
        {submitError && (
          <p className="text-sm text-[var(--rouge)] text-center" role="alert">{submitError}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={sending || !isContactValid}
          className="w-full px-6 py-3.5 font-medium bg-[var(--ink)] text-[var(--paper-3)] border border-[var(--ink)] hover:bg-[var(--rouge)] hover:border-[var(--rouge)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base cursor-pointer"
          style={r2}
        >
          {sending
            ? t.summary.processing
            : paymentMethod === "stripe"
            ? `${t.checkout.payNowBtn} — €${booking.price || 0}`
            : `${t.checkout.reserveBtn} — €${booking.price || 0} ${t.checkout.payOnSiteLabel}`}
        </button>

        {/* Reassurance — answers the last-minute objections right at the button */}
        <ul className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[12px] text-[var(--ink-2)]">
          <li>✓ {t.checkout.reassuranceCancel}</li>
          <li>✓ {t.checkout.reassuranceInstant}</li>
          <li>✓ {t.checkout.reassuranceSecure}</li>
        </ul>

        <button
          onClick={onBack}
          className="text-sm text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors font-medium cursor-pointer"
        >
          {t.checkout.modify}
        </button>
      </div>

      {!isContactValid && (
        <p className="text-sm text-[var(--rouge)] text-center mt-3">
          {t.validation.fillContact}
        </p>
      )}
    </div>
  );
};

export default RegularCheckout;
