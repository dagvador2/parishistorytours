import React, { useState, useEffect } from "react";
import { useBooking } from "../BookingContext";
import { getTourName } from "../../../data/tour-info";
import { track } from "../../../scripts/track";
import ConfirmationPanel, { stripColon } from "./ConfirmationPanel";

interface Props {
  onBack: () => void;
  onRestart: () => void;
}

const r2: React.CSSProperties = { borderRadius: 2 };
const display: React.CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 500 };

const inputClass =
  "w-full border border-[var(--border)] bg-[var(--paper-3)] px-4 py-3 text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none transition-colors";

const PrivateCheckout: React.FC<Props> = ({ onBack, onRestart }) => {
  const { booking, setBooking, resetBooking, t, lang } = useBooking();
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const langPrefix = lang === "fr" ? "/fr" : "";

  useEffect(() => {
    track("begin_checkout", { mode: "private", tour: booking.tour });
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
          message: booking.message || null,
          phone: booking.phone || null,
          locale: lang,
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
        body: JSON.stringify({
          ...booking,
          bookingId: privateBooking.id,
          locale: lang,
        }),
      });
      track("private_request_submitted", { tour: booking.tour });
      setConfirmed(true);
    } catch (error) {
      console.error("Private booking error:", error);
      setSubmitError(t.summary.errorGeneral);
    }
    setSending(false);
  };

  const handleNewBooking = () => {
    setConfirmed(false);
    resetBooking();
    onRestart();
  };

  // --- Confirmed state ---
  if (confirmed) {
    return (
      <ConfirmationPanel
        title={t.success.title}
        message={t.summary.privateConfirmMessage}
        detailsTitle={t.summary.yourRequestDetails}
        rows={[
          { label: stripColon(t.summary.tour), value: tourName },
          {
            label: stripColon(t.summary.dateTime),
            value: `${booking.date ? formatDate(booking.date) : ""} ${t.calendar.at} ${booking.time}`,
          },
          { label: stripColon(t.summary.participants), value: participantsLabel },
        ]}
        newBookingLabel={t.summary.makeNewBooking}
        onNewBooking={handleNewBooking}
        homeHref={`${langPrefix}/`}
        homeLabel={t.success.returnHome}
      />
    );
  }

  // --- Checkout form ---
  return (
    <div
      className="bg-[var(--paper-3)] border border-[var(--border)] p-4 sm:p-6 md:p-8"
      style={{ ...r2, fontFamily: "var(--font-sans)" }}
    >
      {/* Summary recap */}
      <div className="bg-[var(--paper-2)] border border-[var(--border)] p-4 sm:p-5 mb-6 sm:mb-8" style={r2}>
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
          </span>
          <span className="text-[var(--ink-2)]">{t.summary.participants}</span>
          <span className="text-[var(--ink)] text-right">{participantsLabel}</span>
          <span className="text-[var(--ink-2)]">{t.summary.tourType}</span>
          <span className="text-[var(--ink)] text-right">{t.privateTour}</span>
        </div>
      </div>

      {/* Contact form */}
      <h3 className="text-lg text-[var(--ink)] mb-5 text-center" style={display}>
        {t.checkout.contactTitle}
      </h3>
      <div className="space-y-4 mb-8 max-w-md mx-auto">
        <div>
          <label htmlFor="private-name" className="block text-sm font-medium text-[var(--ink)] mb-1">
            {t.contact.name}
          </label>
          <input
            type="text"
            id="private-name"
            required
            className={inputClass}
            style={r2}
            placeholder={t.contact.namePlaceholder}
            value={booking.name || ""}
            onChange={(e) => updateField("name", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="private-email" className="block text-sm font-medium text-[var(--ink)] mb-1">
            {t.contact.email}
          </label>
          <input
            type="email"
            id="private-email"
            required
            className={inputClass}
            style={r2}
            placeholder={t.contact.emailPlaceholder}
            value={booking.email || ""}
            onChange={(e) => updateField("email", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="private-phone" className="block text-sm font-medium text-[var(--ink)] mb-1">
            {t.contact.phone}
          </label>
          <input
            type="tel"
            id="private-phone"
            className={inputClass}
            style={r2}
            placeholder={t.contact.phonePlaceholder}
            value={booking.phone || ""}
            onChange={(e) => updateField("phone", e.target.value)}
          />
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
          {sending ? t.summary.processing : t.checkout.sendRequest}
        </button>

        {/* Reassurance — set expectations right at the button */}
        <ul className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[12px] text-[var(--ink-2)]">
          <li>✓ {t.checkout.reassuranceReply}</li>
          <li>✓ {t.checkout.reassuranceCancel}</li>
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

export default PrivateCheckout;
