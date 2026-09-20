import React, { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useBooking } from "../BookingContext";
import { track } from "../../../scripts/track";
import type { Tour } from "../types";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const r2: React.CSSProperties = { borderRadius: 2 };
const display: React.CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 500 };

const PrivateSetup: React.FC<Props> = ({ onNext, onBack }) => {
  const { booking, setBooking, t, lang } = useBooking();
  const [attempted, setAttempted] = useState(false);

  const locale = lang === "fr" ? "fr-FR" : "en-US";

  const today = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);

  const selectedDay = booking.date ? new Date(booking.date + "T00:00:00") : undefined;

  const chooseTour = (tour: Tour) => {
    track("select_tour", { tour, source: "private_setup" });
    setBooking({ ...booking, tour });
  };

  const increment = () => {
    if (booking.participants < 10) {
      setBooking({ ...booking, participants: booking.participants + 1 });
    }
  };

  const decrement = () => {
    if (booking.participants > 1) {
      setBooking({ ...booking, participants: booking.participants - 1 });
    }
  };

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      const y = day.getFullYear();
      const m = String(day.getMonth() + 1).padStart(2, "0");
      const dd = String(day.getDate()).padStart(2, "0");
      setBooking({ ...booking, date: `${y}-${m}-${dd}` });
    }
  };

  const updateTime = (value: string) => setBooking({ ...booking, time: value });
  const updateMessage = (value: string) => setBooking({ ...booking, message: value });

  const timeOptions: string[] = [];
  for (let h = 9; h <= 18; h++) {
    timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
    if (h < 18) {
      timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
    }
  }

  const formatTimeLabel = (val: string) => {
    if (lang === "fr") return val;
    const [hourStr, minStr] = val.split(":");
    const hour = parseInt(hourStr);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minStr} ${ampm}`;
  };

  const isValid =
    booking.tour &&
    booking.participants > 0 &&
    booking.date &&
    booking.time;

  const handleNext = () => {
    setAttempted(true);
    if (isValid) {
      setBooking({ ...booking, tourType: "private" });
      onNext();
    }
  };

  const tourOptions: { id: Tour; label: string; desc: string; img: string; featured?: boolean }[] = [
    { id: "left-bank", label: t.leftBank, desc: t.leftBankDesc, img: "/photos/thumbnails/pantheon_thumb.webp", featured: true },
    { id: "right-bank", label: t.rightBank, desc: t.rightBankDesc, img: "/photos/thumbnails/vendome_thumb.webp" },
    { id: "general-history", label: t.generalHistory, desc: t.generalHistoryDesc, img: "/photos/general_history/stop2_ile_cite.webp" },
    { id: "food-wine", label: t.foodWineTour || "Nourritour · Food & Wine", desc: t.foodWineDesc, img: "/photos/food_and_wine/nourritour-fromages-tomme-chevre-fromagerie.webp" },
  ];

  return (
    <div
      className="bg-[var(--paper-3)] border border-[var(--border)] p-6 md:p-8"
      style={{ ...r2, fontFamily: "var(--font-sans)" }}
    >
      <h3 className="text-xl text-[var(--ink)] mb-6 text-center" style={display}>
        {t.privateSetup?.title || "Configure your private tour"}
      </h3>

      {/* Tour selection */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-[var(--ink)] mb-3">
          {t.step1Setup.chooseTour}
        </h4>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {tourOptions.map(({ id, label, desc, img, featured }) => {
            const isSelected = booking.tour === id;
            // The left bank outsells the rest, so it stays visible even when
            // another card is hovered and carries a "best seller" ribbon.
            const isHighlighted = featured && !booking.tour;
            return (
              <div
                key={id}
                onClick={() => chooseTour(id)}
                className={`flex-1 max-w-xs cursor-pointer transition-all duration-200
                  ${!isSelected && booking.tour ? "opacity-40" : "opacity-100"}`}
              >
                <div
                  className={`relative overflow-hidden border ${
                    isSelected
                      ? "border-[var(--ink)]"
                      : isHighlighted
                        ? "border-[var(--rouge)]"
                        : "border-[var(--border)] hover:border-[var(--ink)]"
                  }`}
                  style={{
                    ...r2,
                    outline: isSelected
                      ? "1.5px solid var(--ink)"
                      : isHighlighted
                        ? "1.5px solid var(--rouge)"
                        : "none",
                  }}
                >
                  {featured && !isSelected && (
                    <span
                      className="absolute top-0 left-0 z-10 bg-[var(--rouge)] text-white text-[10px] font-semibold uppercase px-2.5 py-1"
                      style={{ letterSpacing: "0.12em", borderBottomRightRadius: 2 }}
                    >
                      {t.privateSetup?.bestSeller || "Best seller"}
                    </span>
                  )}
                  <img
                    src={img}
                    alt={label}
                    width={640}
                    height={427}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-36 object-cover"
                  />
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center transition-colors
                      ${isSelected ? "bg-black/45" : "bg-black/30 hover:bg-black/40"}`}
                  >
                    <span className="text-white text-xl tracking-wide drop-shadow-lg" style={display}>
                      {label}
                    </span>
                    <span className="text-white/90 text-xs mt-1 drop-shadow px-3 text-center">{desc}</span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-7 h-7 bg-[var(--ink)] rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Participants */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-[var(--ink)] mb-3">
          {t.step1Setup.participants}
        </h4>
        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={decrement}
            disabled={booking.participants <= 1}
            className="w-10 h-10 border border-[var(--ink)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper-3)] transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
            style={r2}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <span className="text-3xl text-[var(--ink)] w-12 text-center" style={display}>
            {booking.participants}
          </span>
          <button
            type="button"
            onClick={increment}
            disabled={booking.participants >= 10}
            className="w-10 h-10 border border-[var(--ink)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper-3)] transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
            style={r2}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-[var(--ink-2)] mt-1 text-center">
          {booking.participants} {booking.participants === 1 ? t.person : t.people}
        </p>
      </div>

      {/* Date & Time */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col items-center">
          <h4 className="text-sm font-medium text-[var(--ink)] mb-3 self-start">
            {t.private.preferredDate}
          </h4>
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={handleDaySelect}
            weekStartsOn={1}
            disabled={[{ before: today }, { after: maxDate }]}
            footer={
              selectedDay && (
                <p className="mt-2 text-sm text-[var(--ink)] text-center font-medium">
                  {selectedDay.toLocaleDateString(locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )
            }
          />
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="private-time" className="block text-sm font-medium text-[var(--ink)] mb-2">
              {t.private.preferredTime}{" "}
              <span className="font-normal text-xs text-[var(--ink-2)]">
                {t.upcoming?.parisTime || "All times are Paris time (CET/CEST)."}
              </span>
            </label>
            <select
              id="private-time"
              className="w-full border border-[var(--border)] px-4 py-3 bg-[var(--paper-3)] focus:border-[var(--ink)] focus:outline-none text-[var(--ink)] transition-colors"
              style={r2}
              value={booking.time || ""}
              onChange={(e) => updateTime(e.target.value)}
            >
              <option value="">{t.private.selectTime}</option>
              {timeOptions.map((val) => (
                <option key={val} value={val}>
                  {formatTimeLabel(val)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="private-message" className="block text-sm font-medium text-[var(--ink)] mb-2">
              {t.step2Private.messageLabel}
            </label>
            <textarea
              id="private-message"
              className="w-full border border-[var(--border)] px-4 py-3 bg-[var(--paper-3)] focus:border-[var(--ink)] focus:outline-none resize-none text-[var(--ink)] transition-colors"
              style={r2}
              rows={4}
              placeholder={t.step2Private.messagePlaceholder}
              value={booking.message || ""}
              onChange={(e) => updateMessage(e.target.value)}
            />
          </div>

          <div
            className="bg-[var(--paper-2)] border border-[var(--border)] p-4"
            style={{ ...r2, borderLeft: "2px solid var(--rouge)" }}
          >
            <p className="text-sm text-[var(--ink-2)]">
              <strong className="text-[var(--ink)]">{t.private.note}</strong> {t.private.noteText}
            </p>
          </div>
        </div>
      </div>

      {/* Validation */}
      {attempted && !isValid && (
        <p className="text-sm text-[var(--rouge)] text-center mb-4">
          {t.privateSetup?.validation || "Please select a tour, date, and time."}
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-4 justify-center">
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-[var(--border)] text-[var(--ink-2)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors text-sm font-medium cursor-pointer"
          style={r2}
        >
          {t.back}
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-3 font-medium transition-colors cursor-pointer bg-[var(--ink)] text-[var(--paper-3)] border border-[var(--ink)] hover:bg-[var(--rouge)] hover:border-[var(--rouge)] text-base"
          style={r2}
        >
          {t.next}
        </button>
      </div>
    </div>
  );
};

export default PrivateSetup;
