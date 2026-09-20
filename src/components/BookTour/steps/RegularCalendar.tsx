import React, { useState, useEffect, useRef } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useBooking } from "../BookingContext";
import { getTourName, getTourStops, tourInfo } from "../../../data/tour-info";
import { track } from "../../../scripts/track";
import type { SessionSlot, Tour } from "../types";
import { formatParisTime, parisDateKey, parisTimeKey } from "../../../lib/paris-time";

const TOUR_SLUGS: Tour[] = ["left-bank", "right-bank", "general-history", "food-wine"];

interface Props {
  onNext: () => void;
  onBack: () => void;
  /** Session picked from the "next dates" quick list — opens pre-selected. */
  initialSlot?: SessionSlot | null;
}

const r2: React.CSSProperties = { borderRadius: 2 };
const display: React.CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 500 };

const RegularCalendar: React.FC<Props> = ({ onNext, onBack, initialSlot = null }) => {
  const { booking, setBooking, t, lang } = useBooking();
  // The picker works in bare calendar days; the slot's day is the one it falls
  // on in Paris, which is not always the visitor's own.
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(
    initialSlot ? new Date(parisDateKey(initialSlot.start_time) + "T00:00:00") : undefined
  );
  const [slots, setSlots] = useState<SessionSlot[]>(initialSlot ? [initialSlot] : []);
  const [availableDays, setAvailableDays] = useState<Record<string, number>>({});
  const [priceByTour, setPriceByTour] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<SessionSlot | null>(initialSlot);
  const [participants, setParticipants] = useState(2);
  // Self-guided fallback offer (digital product) — price fetched live, label degrades without it.
  const [selfGuidedPrice, setSelfGuidedPrice] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/self-guided/price?lang=${lang === "fr" ? "fr" : "en"}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => { if (p && typeof p.amountCents === "number") setSelfGuidedPrice(`€${(p.amountCents / 100).toFixed(p.amountCents % 100 ? 2 : 0)}`); })
      .catch(() => {});
  }, [lang]);
  const [participantError, setParticipantError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const firstRun = useRef(true);

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  // When a tour is pre-selected (tour page or homepage card click), the
  // calendar only shows that tour's sessions — no unrelated dates mixed in.
  const tourFilter = booking.tour || "";
  const tu = t.upcoming || {};

  // Fetch live Stripe price for each tour in parallel — keyed by tour slug.
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const entries = await Promise.all(
          TOUR_SLUGS.map(async (slug) => {
            const res = await fetch(`/api/stripe-price?tour=${slug}`);
            if (!res.ok) return [slug, null] as const;
            const data = await res.json();
            return [slug, data.unit_amount / 100] as const;
          })
        );
        const map: Record<string, number> = {};
        for (const [slug, amount] of entries) {
          if (amount != null) map[slug] = amount;
        }
        setPriceByTour(map);
      } finally {
        setPriceLoading(false);
      }
    };
    fetchPrices();
  }, []);

  const priceFor = (tourType: string): number => priceByTour[tourType] ?? 0;
  const selectedPrice = selectedSlot ? priceFor(selectedSlot.tour_type) : 0;

  // Fetch available days (respecting the tour filter).
  useEffect(() => {
    const fetchDays = async () => {
      try {
        const res = await fetch(
          `/api/sessions?participants=1${tourFilter ? `&tour=${tourFilter}` : ""}`
        );
        if (!res.ok) return;
        const { availableDays: days } = await res.json();
        setAvailableDays(days || {});
      } catch (err) {
        console.error("Error fetching sessions:", err);
      }
    };
    fetchDays();
  }, [tourFilter]);

  // Fetch slots for the selected day.
  useEffect(() => {
    if (!selectedDay) return;
    // The very first run may carry a pre-selected slot from the quick list —
    // keep that selection instead of clearing it.
    const skipReset = firstRun.current && initialSlot != null;
    firstRun.current = false;
    const fetchSlots = async () => {
      try {
        const dateStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`;
        const res = await fetch(
          `/api/sessions/${dateStr}?participants=1${tourFilter ? `&tour=${tourFilter}` : ""}`
        );
        if (!res.ok) return;
        const { slots: fetched } = await res.json();
        setSlots(fetched || []);
      } catch (err) {
        console.error("Error fetching slots:", err);
      }
    };
    fetchSlots();
    if (!skipReset) {
      setSelectedSlot(null);
      setParticipantError("");
    }
  }, [selectedDay, tourFilter]);

  const clearFilter = () => {
    setBooking({ ...booking, tour: undefined as unknown as Tour });
    setSelectedSlot(null);
  };

  const selectSlot = (slot: SessionSlot) => {
    track("select_session", { tour: slot.tour_type, source: "calendar" });
    setSelectedSlot(slot);
    setParticipantError("");
    if (participants > slot.free) {
      setParticipantError(
        t.regularCalendar?.tooManyParticipants ||
          `Only ${slot.free} spots available for this session.`
      );
    }
  };

  const changeParticipants = (delta: number) => {
    const next = participants + delta;
    if (next < 1 || next > 10) return;
    setParticipants(next);
    setParticipantError("");
    if (selectedSlot && next > selectedSlot.free) {
      setParticipantError(
        t.regularCalendar?.tooManyParticipants ||
          `Only ${selectedSlot.free} spots available for this session.`
      );
    }
  };

  const isValid = selectedSlot && participants >= 1 && participants <= (selectedSlot?.free ?? 0);

  const handleNext = () => {
    setAttempted(true);
    if (!isValid || !selectedSlot) return;

    // What goes to Stripe, to the booking row and to both confirmation emails
    // is the Paris date and hour of the session — never the visitor's reading
    // of it, which would put a London customer on a 09:30 tour that has no
    // 09:30.
    const date = parisDateKey(selectedSlot.start_time);
    const time = parisTimeKey(selectedSlot.start_time);

    setBooking({
      ...booking,
      tour: selectedSlot.tour_type as Tour,
      tourType: "regular",
      sessionId: selectedSlot.id,
      date,
      time,
      participants,
      price: selectedPrice * participants,
    });
    onNext();
  };

  const formatTime = (dateTime: string) =>
    formatParisTime(dateTime, locale, { hour12: lang !== "fr" });

  const modifiers = {
    available: Object.keys(availableDays).map((d) => new Date(d + "T00:00:00")),
  };

  return (
    <div
      className="bg-[var(--paper-3)] border border-[var(--border)] p-6 md:p-8"
      style={{ ...r2, fontFamily: "var(--font-sans)" }}
    >
      <h3 className="text-xl mb-2 text-center text-[var(--ink)]" style={display}>
        {t.regularCalendar?.title || "Choose a session"}
      </h3>
      <p className="text-sm text-[var(--ink-2)] text-center mb-1">
        {t.regularCalendar?.subtitle || "Select a date to see available tours"}
      </p>
      <p className="text-xs text-[var(--ink-2)] text-center mb-4">
        {tu.parisTime || "All times are Paris time (CET/CEST)."}
      </p>

      {tourFilter && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-5 text-sm">
          <span className="text-[var(--ink-2)]">
            {tu.showingTour || "Showing dates for"}{" "}
            <b className="text-[var(--ink)] font-medium">{getTourName(tourFilter, lang)}</b>
          </span>
          <button
            type="button"
            onClick={clearFilter}
            className="underline underline-offset-2 text-[var(--ink-2)] hover:text-[var(--ink)] cursor-pointer"
          >
            {tu.showAll || "Show all tours"}
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Calendar */}
        <div className="flex flex-col items-center">
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            weekStartsOn={1}
            modifiers={modifiers}
            modifiersClassNames={{ available: "pht-day-available" }}
            disabled={[{ before: new Date() }]}
            footer={
              <p className="mt-2 text-sm text-[var(--ink-2)] text-center">
                {t.regularCalendar?.highlightedDates || "Highlighted dates have available sessions."}
              </p>
            }
          />
        </div>

        {/* Slots */}
        <div>
          {selectedDay && (
            <div>
              <h4 className="text-[var(--ink)] mb-4 text-center md:text-left text-lg" style={display}>
                {selectedDay.toLocaleDateString(locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h4>
              {slots.length > 0 ? (
                <div className="space-y-3">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const tourName = getTourName(slot.tour_type, lang);
                    const tourStops = getTourStops(slot.tour_type, lang);
                    const low = slot.free <= 3;
                    const tourThumb = tourInfo[slot.tour_type]?.thumb;
                    const slotPrice = priceFor(slot.tour_type);

                    return (
                      <button
                        key={slot.id}
                        onClick={() => selectSlot(slot)}
                        className={`w-full border text-left transition-colors duration-150 overflow-hidden cursor-pointer ${
                          isSelected
                            ? "border-[var(--ink)] bg-[var(--paper-2)]"
                            : "border-[var(--border)] hover:border-[var(--ink)]"
                        }`}
                        style={r2}
                        disabled={priceLoading}
                      >
                        <div className="flex items-stretch">
                          {tourThumb && (
                            <img
                              src={tourThumb}
                              alt={tourName}
                              width={120}
                              height={90}
                              loading="lazy"
                              decoding="async"
                              className="w-24 h-auto object-cover flex-shrink-0 hidden sm:block"
                            />
                          )}
                          <div className="flex justify-between items-start flex-1 p-4">
                            <div className="flex-1">
                              <div className="text-lg text-[var(--ink)]" style={display}>
                                {formatTime(slot.start_time)}
                              </div>
                              <div className="text-sm font-medium text-[var(--ink)] mt-0.5">
                                {tourName}
                              </div>
                              <div className="text-xs text-[var(--ink-2)] mt-0.5">{tourStops}</div>
                              <div
                                className={`text-sm mt-1 ${
                                  low ? "text-[var(--rouge)] font-semibold" : "text-[var(--ink-2)]"
                                }`}
                              >
                                {slot.free} {t.calendar.spotsAvailable}
                                {!priceLoading && slotPrice > 0 && (
                                  <span className="text-[var(--ink-2)] font-normal">
                                    {" "}
                                    · €{slotPrice} {t.calendar.perPerson}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="ml-3 w-6 h-6 bg-[var(--ink)] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[var(--ink-2)] text-sm">
                    {t.calendar.noSessions} {t.calendar.onThisDate}
                  </p>
                </div>
              )}
            </div>
          )}
          {!selectedDay && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="w-12 h-12 border border-[var(--border)] flex items-center justify-center mb-3"
                style={r2}
              >
                <svg
                  className="w-6 h-6 text-[var(--ink-2)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>
              <p className="text-[var(--ink-2)] text-sm">{t.calendar.selectDate}</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected session summary + participants */}
      {selectedSlot && (
        <div
          className="mt-6 p-5 bg-[var(--paper-2)] border border-[var(--border)]"
          style={{ ...r2, borderLeft: "2px solid var(--rouge)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-[var(--ink)]" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-[var(--ink)] font-medium">{t.calendar.sessionSelected}</span>
          </div>
          <p className="text-sm text-[var(--ink-2)] mb-1">
            {selectedDay?.toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}{" "}
            · {formatTime(selectedSlot.start_time)}
          </p>
          <p className="text-sm text-[var(--ink-2)] mb-4">
            {getTourName(selectedSlot.tour_type, lang)}
          </p>

          {/* Participants counter */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-[var(--ink)]">
                {t.step1Setup.participants}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => changeParticipants(-1)}
                  disabled={participants <= 1}
                  className="w-9 h-9 border border-[var(--ink)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper-3)] transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                  style={r2}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-2xl text-[var(--ink)] w-8 text-center" style={display}>
                  {participants}
                </span>
                <button
                  type="button"
                  onClick={() => changeParticipants(1)}
                  disabled={participants >= 10}
                  className="w-9 h-9 border border-[var(--ink)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper-3)] transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                  style={r2}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl text-[var(--ink)]" style={display}>
                {t.calendar.total} €{selectedPrice * participants}
              </div>
              <div className="text-xs text-[var(--ink-2)]">
                {participants} × €{selectedPrice}
              </div>
            </div>
          </div>

          {participantError && (
            <p className="text-sm text-[var(--rouge)] mt-2">{participantError}</p>
          )}
        </div>
      )}

      {/* Validation message */}
      {attempted && !isValid && (
        <p className="text-sm text-[var(--rouge)] text-center mt-4">
          {t.validation.chooseSession}
        </p>
      )}

      {/* Self-guided fallback: the main capture point for visitors who find no date */}
      <div className="mt-8 border border-[var(--border)] bg-[var(--paper-2)] px-4 py-3 text-center" style={r2}>
        <div className="text-sm text-[var(--ink-2)]">{t.regularCalendar?.selfGuidedTitle || "No date works for you?"}</div>
        <a
          href={`${lang === "fr" ? "/fr" : ""}/self-guided-tour`}
          className="text-sm font-medium text-[var(--rouge)] underline underline-offset-4"
          onClick={() => track("self_guided_cta_click", { source: "calendar", tour: booking.tour || "" })}
        >
          {selfGuidedPrice
            ? (t.regularCalendar?.selfGuidedCta || "Get the self-guided Left Bank version — {price}").replace("{price}", selfGuidedPrice)
            : (t.regularCalendar?.selfGuidedCtaNoPrice || "Get the self-guided Left Bank version")}
        </a>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center gap-4 justify-center">
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

export default RegularCalendar;
