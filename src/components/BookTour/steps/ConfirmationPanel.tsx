import React from "react";

export interface ConfirmationRow {
  label: string;
  value: React.ReactNode;
  /** Small secondary line under the value (time zone, payment terms…). */
  note?: string;
  strong?: boolean;
}

interface Props {
  title: string;
  message: string;
  detailsTitle: string;
  rows: ConfirmationRow[];
  newBookingLabel: string;
  onNewBooking: () => void;
  homeHref: string;
  homeLabel: string;
}

const r2: React.CSSProperties = { borderRadius: 2 };
const display: React.CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 500 };

/** Summary labels carry their own colon ("Tour:", "Visite :"). The stacked
 *  label/value layout makes it redundant, so it is dropped here. */
export const stripColon = (label: string) => label.replace(/\s*:\s*$/, "");

/** Final screen shared by the scheduled and private paths: a tick, the
 *  message, the request recap as a stacked ticket, and the two exits. */
const ConfirmationPanel: React.FC<Props> = ({
  title,
  message,
  detailsTitle,
  rows,
  newBookingLabel,
  onNewBooking,
  homeHref,
  homeLabel,
}) => (
  <div
    className="bg-[var(--paper-3)] border border-[var(--border)] p-5 sm:p-8"
    style={{ ...r2, fontFamily: "var(--font-sans)" }}
  >
    <div className="text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 border border-[var(--ink)] rounded-full flex items-center justify-center text-[var(--ink)]">
        <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-2xl text-[var(--ink)] mb-3" style={display}>
        {title}
      </h3>
      <p className="text-sm sm:text-base leading-relaxed text-[var(--ink-2)] mb-6 max-w-md mx-auto">
        {message}
      </p>

      <div
        className="bg-[var(--paper-2)] border border-[var(--border)] p-4 sm:p-5 mb-6 max-w-sm mx-auto text-left"
        style={r2}
      >
        <p className="text-base text-[var(--ink)] mb-2" style={display}>
          {detailsTitle}
        </p>
        <dl>
          {rows.map((row) => (
            <div
              key={row.label}
              className="py-2.5 border-t border-[var(--border)] first:border-t-0 last:pb-0"
            >
              <dt className="text-[11px] uppercase tracking-[0.15em] text-[var(--ink-2)] mb-0.5">
                {row.label}
              </dt>
              <dd className={`text-[15px] leading-snug text-[var(--ink)] ${row.strong ? "font-semibold" : ""}`}>
                {row.value}
                {row.note && (
                  <span className="block text-xs font-normal text-[var(--ink-2)] mt-0.5">{row.note}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        <button
          onClick={onNewBooking}
          className="w-full py-3 px-4 bg-[var(--ink)] text-[var(--paper-3)] border border-[var(--ink)] hover:bg-[var(--rouge)] hover:border-[var(--rouge)] transition-colors font-medium cursor-pointer"
          style={r2}
        >
          {newBookingLabel}
        </button>
        <a
          href={homeHref}
          className="block w-full py-3 px-4 border border-[var(--border)] text-[var(--ink-2)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors font-medium"
          style={r2}
        >
          {homeLabel}
        </a>
      </div>
    </div>
  </div>
);

export default ConfirmationPanel;
