/**
 * The two emails nobody triggers by hand: the reminder the evening before a
 * walk, and the thank-you the morning after.
 *
 * Both read the database rather than a request body, which is why a booking
 * now stores the language it was made in. Both stamp a `*_sent_at` column
 * before they are considered done, so a retried cron, a redeploy or a manual
 * run never writes to the same person twice.
 *
 * Vercel crons fire on UTC, and Paris is one or two hours ahead of it
 * depending on the season; on the Hobby plan a cron may also run up to an
 * hour late, and only once a day. So the schedule fires once (17:00 UTC for
 * the reminder, 08:00 for the thank-you) and `withinParisHours()` only
 * checks that the clock is somewhere sensible — it is a guard against a
 * misconfigured schedule, not a way of picking the minute.
 */
import { supabase } from './supabase';
import { sendReminderEmail, sendThanksEmail, type BookingEmailPayload } from './email';
import { parisDateKey, parisTimeKey } from './paris-time';

export interface RunReport {
  ran: boolean;
  /** Why the run did nothing, when it did nothing. */
  reason?: string;
  considered: number;
  sent: number;
  skipped: Array<{ ref: string; why: string }>;
  failed: Array<{ ref: string; why: string }>;
}

/** True when the Paris clock reads between `from` and `to` inclusive, in hours. */
export function withinParisHours(from: number, to: number, now = new Date()): boolean {
  const hour = Number(parisTimeKey(now).slice(0, 2));
  return hour >= from && hour <= to;
}

/** Paris calendar day, `offset` days from today. */
function parisDayOffset(offset: number, now = new Date()): string {
  const today = parisDateKey(now);
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

interface BookingRow {
  id: string;
  customer_email: string | null;
  customer_name: string | null;
  participants_count: number | null;
  total_price: number | null;
  tour_type: string | null;
  booking_date: string | null;
  booking_time: string | null;
  payment_method: string | null;
  email_locale: string | null;
  tour_language: string | null;
  session_id: string | null;
  source: string | null;
}

const COLUMNS =
  'id, customer_email, customer_name, participants_count, total_price, tour_type, booking_date, booking_time, payment_method, email_locale, tour_language, session_id, source';

function toPayload(r: BookingRow): BookingEmailPayload {
  return {
    email: r.customer_email!,
    name: r.customer_name ?? '',
    bookingId: r.id,
    tour: r.tour_type ?? '',
    tourType: 'regular',
    participants: r.participants_count ?? 1,
    date: r.booking_date!,
    time: r.booking_time!,
    price: r.total_price,
    paymentMethod: r.payment_method === 'on_site' ? 'on_site' : 'stripe',
    locale: r.email_locale ?? 'en',
    tourLanguage: r.tour_language,
    sessionId: r.session_id ?? undefined,
    source: r.source,
  };
}

async function fetchDue(dateKey: string, sentColumn: 'reminder_sent_at' | 'thanks_sent_at') {
  return supabase
    .from('bookings')
    .select(COLUMNS)
    .eq('booking_date', dateKey)
    .eq('status', 'confirmed')
    .is(sentColumn, null)
    .not('customer_email', 'is', null);
}

async function run(
  dateKey: string,
  sentColumn: 'reminder_sent_at' | 'thanks_sent_at',
  sendOne: (p: BookingEmailPayload) => Promise<{ success: boolean; skipped?: string; error?: string }>,
): Promise<RunReport> {
  const report: RunReport = { ran: true, considered: 0, sent: 0, skipped: [], failed: [] };

  const { data, error } = await fetchDue(dateKey, sentColumn);
  if (error) {
    report.failed.push({ ref: '—', why: `query failed: ${error.message}` });
    return report;
  }

  const rows = (data ?? []) as BookingRow[];
  report.considered = rows.length;

  for (const row of rows) {
    const ref = row.id.slice(-4).toUpperCase();
    if (!row.booking_date || !row.booking_time || !row.tour_type) {
      report.skipped.push({ ref, why: 'incomplete booking row' });
      continue;
    }
    const result = await sendOne(toPayload(row));
    if (result.skipped) {
      report.skipped.push({ ref, why: result.skipped });
      continue;
    }
    if (!result.success) {
      report.failed.push({ ref, why: result.error ?? 'unknown error' });
      continue;
    }
    // Stamped only after the send returned an id: a crash between the two
    // re-sends one email, which is a far smaller sin than silently skipping.
    const { error: markError } = await supabase
      .from('bookings')
      .update({ [sentColumn]: new Date().toISOString() })
      .eq('id', row.id);
    if (markError) {
      report.failed.push({ ref, why: `sent but not marked: ${markError.message}` });
      continue;
    }
    report.sent++;
  }

  return report;
}

const idle = (reason: string): RunReport => ({ ran: false, reason, considered: 0, sent: 0, skipped: [], failed: [] });

/**
 * The evening before: 17:00 UTC lands at 18:00 Paris in winter and 19:00 in
 * summer, plus up to an hour of Hobby-plan delay. `force` is for a manual run
 * from the admin session, whatever the clock says.
 */
export async function runReminders(now = new Date(), force = false): Promise<RunReport> {
  if (!force && !withinParisHours(17, 21, now)) return idle(`outside the evening window (${parisTimeKey(now)} Paris)`);
  return run(parisDayOffset(1, now), 'reminder_sent_at', sendReminderEmail);
}

/** The morning after: 08:00 UTC is 09:00 or 10:00 Paris, plus the same delay. */
export async function runThanks(now = new Date(), force = false): Promise<RunReport> {
  if (!force && !withinParisHours(8, 12, now)) return idle(`outside the morning window (${parisTimeKey(now)} Paris)`);
  return run(parisDayOffset(-1, now), 'thanks_sent_at', sendThanksEmail);
}
