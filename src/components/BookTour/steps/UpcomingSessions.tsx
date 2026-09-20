import React, { useEffect, useState } from "react";
import { useBooking } from "../BookingContext";
import { getTourName, getTourStops } from "../../../data/tour-info";
import { track } from "../../../scripts/track";
import type { SessionSlot, Tour } from "../types";
import { formatParisDate, formatParisTime } from "../../../lib/paris-time";

const TOUR_SLUGS: Tour[] = ["left-bank", "right-bank", "general-history", "food-wine"];

interface Props {
  onSelectSlot: (slot: SessionSlot) => void;
  onSeeCalendar: () => void;
  onSelectPrivate: () => void;
  /** Suppressed where the page already carries a dedicated private-tour block,
   *  so the same offer isn't made twice within one screen. */
  hidePrivateLink?: boolean;
}

/**
 * First screen of the booking wizard: the next bookable dates, straight away.
 * Nobody has to understand "regular vs private" or hunt through a calendar
 * before seeing something they can actually book. The full calendar and the
 * private path remain one click away below the list.
 */
const UpcomingSessions: React.FC<Props> = ({ onSelectSlot, onSeeCalendar, onSelectPrivate, hidePrivateLink = false }) => {
  const { booking, setBooking, t, lang } = useBooking();
  const [slots, setSlots] = useState<SessionSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, number>>({});

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const tu = t.upcoming || {};

  useEffect(() => {
    track("view_booking", { tour: booking.tour || "all" });
  }, []);

  // Next sessions — filtered to the pre-selected tour when there is one.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const tourQ = booking.tour ? `&tour=${booking.tour}` : "";
    fetch(`/api/sessions?upcoming=5${tourQ}`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((data) => {
        if (!cancelled) setSlots(Array.isArray(data.slots) ? data.slots : []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [booking.tour]);

  // Live Stripe prices, keyed by tour slug.
  useEffect(() => {
    Promise.all(
      TOUR_SLUGS.map(async (slug) => {
        try {
          const res = await fetch(`/api/stripe-price?tour=${slug}`);
          if (!res.ok) return [slug, null] as const;
          const d = await res.json();
          return [slug, d.unit_amount / 100] as const;
        } catch {
          return [slug, null] as const;
        }
      })
    ).then((entries) => {
      const map: Record<string, number> = {};
      for (const [slug, amount] of entries) {
        if (amount != null) map[slug] = amount;
      }
      setPrices(map);
    });
  }, []);

  const fmtDate = (iso: string) =>
    formatParisDate(iso, locale, { weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (iso: string) =>
    formatParisTime(iso, locale, { hour12: lang !== "fr" });
  const fmtPrice = (n: number) => (lang === "fr" ? `${n} €` : `€${n}`);

  const clearFilter = () => setBooking({ ...booking, tour: undefined as unknown as Tour });

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <h3
        className="text-xl mb-1 text-[var(--ink)]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        {tu.title || "Next available dates"}
      </h3>
      <p className="text-sm text-[var(--ink-2)] mb-1">
        {tu.subtitle || "Pick a session and book in under a minute — or choose another option below."}
      </p>
      <p className="text-xs text-[var(--ink-2)] mb-5">
        {tu.parisTime || "All times are Paris time (CET/CEST)."}
      </p>

      {booking.tour && (
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
          <span className="text-[var(--ink-2)]">
            {tu.showingTour || "Showing dates for"}{" "}
            <b className="text-[var(--ink)] font-medium">{getTourName(booking.tour, lang)}</b>
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

      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--ink-2)]">{tu.loading || "Loading dates…"}</p>
      ) : slots.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--ink-2)] max-w-md mx-auto">
          {tu.empty ||
            "No scheduled dates right now — book a private tour below, or message me on WhatsApp and we'll find one."}
        </p>
      ) : (
        <div className="border-t border-[var(--border)]">
          {slots.map((slot) => {
            const price = prices[slot.tour_type];
            const low = slot.free <= 3;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => {
                  track("select_session", { tour: slot.tour_type, source: "upcoming_list" });
                  onSelectSlot(slot);
                }}
                className="group w-full flex flex-wrap items-center gap-x-6 gap-y-2 py-4 px-2 border-b border-[var(--border)] text-left transition-colors hover:bg-[var(--paper-2)] cursor-pointer"
              >
                <span className="w-36 flex-shrink-0">
                  <b
                    className="block text-[17px] text-[var(--ink)] leading-tight"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                  >
                    {fmtDate(slot.start_time)}
                  </b>
                  <span className="text-[13px] text-[var(--ink-2)]">{fmtTime(slot.start_time)}</span>
                </span>
                <span className="flex-1 min-w-[160px]">
                  <span className="block text-[15px] font-medium text-[var(--ink)]">
                    {getTourName(slot.tour_type, lang)}
                  </span>
                  <span className="block text-[12px] text-[var(--ink-2)]">
                    {getTourStops(slot.tour_type, lang)}
                  </span>
                </span>
                <span
                  className={`text-[12px] tracking-wide ${
                    low ? "text-[var(--rouge)] font-semibold" : "text-[var(--ink-2)]"
                  }`}
                >
                  {(tu.spotsLeft || "{n} spots left").replace("{n}", String(slot.free))}
                </span>
                {price != null && (
                  <span
                    className="text-[16px] text-[var(--ink)]"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                  >
                    {fmtPrice(price)}
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--ink)] border border-[var(--ink)] px-4 py-2 group-hover:bg-[var(--ink)] group-hover:text-[var(--paper-3)] transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  {tu.book || "Book"} <span aria-hidden="true">→</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center">
        <button
          type="button"
          onClick={onSeeCalendar}
          className="text-sm font-medium text-[var(--ink)] underline underline-offset-4 hover:text-[var(--rouge)] cursor-pointer"
        >
          {tu.seeCalendar || "See the full calendar"}
        </button>
        {!hidePrivateLink && (
          <>
            <span className="hidden sm:inline text-[var(--ink-2)]" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={onSelectPrivate}
              className="text-sm font-medium text-[var(--ink)] underline underline-offset-4 hover:text-[var(--rouge)] cursor-pointer"
            >
              {tu.privateCta || "Private tour — pick your own date & time"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default UpcomingSessions;
