import type { Lang } from './format';

/**
 * One booking, in the shape every email template reads it.
 *
 * Templates never see a Supabase row or an API payload directly: both are
 * normalised into this first, so the day-before reminder — which is built
 * from the database, hours after the fact — cannot quietly disagree with the
 * confirmation that was built from the request body.
 */
export interface EmailBooking {
  /** Human-facing reference, "PHT-7431". */
  ref: string;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  /** Tour slug: 'left-bank', 'right-bank', … */
  tour: string;
  tourType: 'regular' | 'private' | string;
  participants: number;
  /** Paris calendar day, "2026-11-15". */
  dateKey: string;
  /** Paris wall clock, "10:30". */
  time: string;
  price?: number | null;
  paymentMethod?: 'on_site' | 'stripe' | null;
  /** Language we write to this customer in. */
  lang: Lang;
  /** Language the tour is guided in, once sessions carry one. */
  tourLanguage?: Lang | null;
  /** Where the booking came from — 'direct', 'viator', … */
  source?: string | null;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

/** "PHT-7431" from a booking uuid, or a timestamp when there is no id yet. */
export function bookingRef(id?: string | null): string {
  const raw = (id ?? '').replace(/[^0-9a-zA-Z]/g, '');
  const tail = raw.length >= 4 ? raw.slice(-4) : String(Date.now()).slice(-4);
  return `PHT-${tail.toUpperCase()}`;
}
