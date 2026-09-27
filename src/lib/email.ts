/**
 * Sending layer for the booking emails.
 *
 * Templates live in ./emails and know nothing about Resend, Supabase or the
 * shape of an API payload; this module normalises what the callers have into
 * an EmailBooking, decides who gets what, and sends it.
 *
 * Four things every message now carries that the previous version did not:
 * a plain-text part (HTML-only mail scores as spam and renders as nothing in
 * text clients), a Reply-To that points at a human, escaped customer input,
 * and — for a confirmed booking — a calendar invitation.
 */
import { Resend } from 'resend';
import { supabase } from './supabase';
import { buildConfirmationEmail, confirmationState } from './emails/booking-confirmation';
import { buildAdminEmail, type SessionContext } from './emails/admin-notification';
import { buildReminderEmail } from './emails/reminder';
import { buildThanksEmail, googleReviewUrl } from './emails/thanks';
import { buildIcs, googleCalendarUrl } from './emails/ics';
import { asLang, longDate, type Lang } from './emails/format';
import { tourFacts } from './emails/tours';
import { bookingRef, type BuiltEmail, type EmailBooking } from './emails/types';
import { parisForecast } from './emails/weather';
import { waLink } from './whatsapp';
import { SUPPORT_EMAIL } from './emails/layout';

// Gmail's list view shows about twenty characters of the sender name; the
// brand has to survive the cut, and the first name is in the signature anyway.
const FROM = 'Paris History Tours <bookings@parishistorytours.com>';
const ADMIN_TO = 'clement@parishistorytours.com';

function env(key: string): string | undefined {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return viteEnv?.[key] ?? process.env[key];
}

function client(): Resend | null {
  const key = env('RESEND_API_KEY');
  return key ? new Resend(key) : null;
}

/** WhatsApp deep link prefilled with the booking, so the first line writes itself. */
function whatsappUrl(b: EmailBooking): string {
  const tour = tourFacts(b.tour).name[b.lang];
  const when = `${longDate(b.dateKey, b.lang)} ${b.time}`;
  return waLink(
    b.lang === 'fr'
      ? `Bonjour Clément, au sujet de ma réservation ${b.ref} (${tour}, ${when}) :`
      : `Hello Clément, about my booking ${b.ref} (${tour}, ${when}):`,
  );
}

export interface BookingEmailPayload {
  email: string;
  name: string;
  bookingId?: string;
  tour: string;
  tourType: 'regular' | 'private' | string;
  participants: number;
  date: string;
  time: string;
  price?: number | null;
  phone?: string | null;
  message?: string | null;
  sessionId?: string;
  paymentMethod?: 'on_site' | 'stripe' | null;
  locale?: 'en' | 'fr' | string;
  /** Language the tour itself is guided in, once sessions carry one. */
  tourLanguage?: 'en' | 'fr' | string | null;
  source?: string | null;
}

export interface BookingEmailResult {
  success: boolean;
  clientEmailId?: string;
  adminEmailId?: string;
  error?: string;
}

function normalise(p: BookingEmailPayload): EmailBooking {
  return {
    ref: bookingRef(p.bookingId),
    name: p.name,
    email: p.email,
    phone: p.phone ?? null,
    message: p.message ?? null,
    tour: p.tour,
    tourType: p.tourType,
    participants: Number(p.participants) || 1,
    dateKey: p.date,
    time: p.time,
    price: p.price ?? null,
    paymentMethod: p.paymentMethod ?? null,
    lang: asLang(p.locale),
    tourLanguage: p.tourLanguage ? asLang(p.tourLanguage) : null,
    source: p.source ?? null,
  };
}

async function sessionLanguage(sessionId: string): Promise<Lang | null> {
  try {
    const { data } = await supabase.from('sessions').select('language').eq('id', sessionId).single();
    return data?.language ? asLang(data.language) : null;
  } catch {
    return null;
  }
}

/**
 * Who else is on this slot. Never fatal: the admin email is more useful with
 * it and perfectly usable without, so any failure returns null.
 */
async function fetchSessionContext(
  sessionId: string | undefined,
  currentBookingId: string | undefined,
): Promise<SessionContext | null> {
  if (!sessionId) return null;
  try {
    const [{ data: session }, { data: rows }] = await Promise.all([
      supabase.from('sessions').select('max_spots').eq('id', sessionId).single(),
      supabase
        .from('bookings')
        .select('id, customer_name, participants_count, payment_method, status')
        .eq('session_id', sessionId),
    ]);
    if (!session || !rows) return null;
    const live = rows.filter((r) => r.status !== 'cancelled');
    return {
      booked: live.reduce((n, r) => n + (r.participants_count ?? 0), 0),
      maxSpots: session.max_spots ?? 10,
      others: live
        .filter((r) => r.id !== currentBookingId)
        .slice(0, 6)
        .map((r) => ({
          name: r.customer_name ?? '—',
          participants: r.participants_count ?? 1,
          paymentMethod: r.payment_method,
        })),
    };
  } catch {
    return null;
  }
}

/** The .ics a confirmed booking carries, plus the one-tap Google link. */
function calendar(b: EmailBooking): { ics: string; url: string } {
  const facts = tourFacts(b.tour);
  const summary = `${facts.name[b.lang]} — Paris History Tours`;
  const location = facts.meetingPoint?.address ?? 'Paris, France';
  const description = facts.meetingPoint
    ? b.lang === 'fr'
      ? `Réservation ${b.ref}. Rendez-vous au ${location}.`
      : `Booking ${b.ref}. We meet at ${location}.`
    : b.lang === 'fr'
      ? `Réservation ${b.ref}. Le point de rendez-vous exact vous est envoyé la veille au soir.`
      : `Booking ${b.ref}. The exact meeting point is emailed to you the evening before.`;
  const shared = {
    dateKey: b.dateKey,
    time: b.time,
    durationMinutes: facts.durationMinutes,
    summary,
    description,
    location,
  };
  return {
    ics: buildIcs({ uid: b.ref, ...shared, url: 'https://www.parishistorytours.com' }),
    url: googleCalendarUrl(shared),
  };
}

async function send(
  resend: Resend,
  to: string,
  built: BuiltEmail,
  opts: { replyTo: string; ics?: string },
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    replyTo: opts.replyTo,
    subject: built.subject,
    html: built.html,
    text: built.text,
    ...(opts.ics
      ? {
          attachments: [
            {
              filename: 'paris-history-tours.ics',
              content: Buffer.from(opts.ics, 'utf8').toString('base64'),
              contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
            },
          ],
        }
      : {}),
  });
  if (error) return { error: error.message };
  return { id: data?.id };
}

/**
 * Confirmation to the customer, notification to Clément.
 *
 * The customer's email is the one that must not fail — it is the only proof
 * they have that the booking exists — so it is sent first and its failure is
 * reported; a failing admin email is logged and swallowed.
 */
export async function sendBookingEmails(payload: BookingEmailPayload): Promise<BookingEmailResult> {
  const resend = client();
  if (!resend) return { success: false, error: 'RESEND_API_KEY missing' };

  const b = normalise(payload);
  // The on-site path posts the wizard's own state, which does not carry the
  // session's language; the row does.
  if (!b.tourLanguage && payload.sessionId) b.tourLanguage = await sessionLanguage(payload.sessionId);
  const state = confirmationState(b);
  const cal = state === 'request' ? null : calendar(b);

  const clientMail = buildConfirmationEmail(b, {
    whatsappUrl: whatsappUrl(b),
    calendarUrl: cal?.url,
  });

  const clientResult = await send(resend, b.email, clientMail, {
    replyTo: SUPPORT_EMAIL,
    ics: cal?.ics,
  });
  if (clientResult.error) {
    console.error('Resend client email error:', clientResult.error);
    return { success: false, error: `Client email failed: ${clientResult.error}` };
  }

  const context = await fetchSessionContext(payload.sessionId, payload.bookingId);
  const adminMail = buildAdminEmail(b, { state, context });
  const adminResult = await send(resend, ADMIN_TO, adminMail, { replyTo: b.email });
  if (adminResult.error) console.error('Resend admin email error:', adminResult.error);

  return { success: true, clientEmailId: clientResult.id, adminEmailId: adminResult.id };
}

/**
 * Day-before reminder. Returns `skipped` — rather than an error — when the
 * tour has no confirmed meeting point, so the cron can report honestly
 * instead of retrying something that will never succeed.
 */
export async function sendReminderEmail(
  payload: BookingEmailPayload,
): Promise<{ success: boolean; id?: string; skipped?: string; error?: string }> {
  const resend = client();
  if (!resend) return { success: false, error: 'RESEND_API_KEY missing' };

  const b = normalise(payload);
  const facts = tourFacts(b.tour);
  if (!facts.meetingPoint) return { success: false, skipped: `no meeting point for "${b.tour}"` };

  const forecast = await parisForecast(b.dateKey, b.time, facts.durationMinutes);
  const built = buildReminderEmail(b, { whatsappUrl: whatsappUrl(b), forecast });
  if (!built) return { success: false, skipped: `no meeting point for "${b.tour}"` };

  const result = await send(resend, b.email, built, { replyTo: SUPPORT_EMAIL });
  if (result.error) return { success: false, error: result.error };
  return { success: true, id: result.id };
}

/** The morning-after thank-you and review request. */
export async function sendThanksEmail(
  payload: BookingEmailPayload,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = client();
  if (!resend) return { success: false, error: 'RESEND_API_KEY missing' };

  const b = normalise(payload);
  const built = buildThanksEmail(b, { reviewUrl: googleReviewUrl(env('GOOGLE_PLACE_ID')) });
  const result = await send(resend, b.email, built, { replyTo: SUPPORT_EMAIL });
  if (result.error) return { success: false, error: result.error };
  return { success: true, id: result.id };
}

export type { Lang };
