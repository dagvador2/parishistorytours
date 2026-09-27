import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { isAdmin, json, unauthorized } from '../../../lib/admin-auth';
import { parisDateKey } from '../../../lib/paris-time';

// GET /api/admin/overview — everything the dashboard shows, in one round trip:
//   pending          private requests waiting for an answer
//   sessions         the next 30 days of slots, each with its bookings
//   privateConfirmed private tours already confirmed, which have no session
//
// Replaces /api/admin/sessions-list, which returned slots without the people
// on them — the one thing a guide actually wants to see the night before.

const BOOKING_COLUMNS =
  'id, session_id, customer_name, customer_email, customer_phone, customer_message, participants_count, total_price, tour_type, booking_date, booking_time, status, payment_method, source, ota_reference, email_locale, tour_language, reminder_sent_at, created_at';

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdmin(cookies)) return unauthorized();

  try {
    const now = new Date();
    const today = parisDateKey(now);
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const [sessionsRes, bookingsRes, pendingRes, privateRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, start_time, tour_type, language, available_spots, max_spots')
        .gte('start_time', now.toISOString())
        .lte('start_time', horizon)
        .order('start_time', { ascending: true }),
      supabase
        .from('bookings')
        .select(BOOKING_COLUMNS)
        .gte('booking_date', today)
        .not('session_id', 'is', null)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true }),
      supabase
        .from('bookings')
        .select(BOOKING_COLUMNS)
        .eq('status', 'pending')
        .gte('booking_date', today)
        .order('booking_date', { ascending: true }),
      supabase
        .from('bookings')
        .select(BOOKING_COLUMNS)
        .is('session_id', null)
        .eq('status', 'confirmed')
        .gte('booking_date', today)
        .order('booking_date', { ascending: true }),
    ]);

    const failed = [sessionsRes, bookingsRes, pendingRes, privateRes].find((r) => r.error);
    if (failed?.error) return json({ error: failed.error.message }, 500);

    const bySession = new Map<string, unknown[]>();
    for (const b of bookingsRes.data ?? []) {
      const list = bySession.get(b.session_id) ?? [];
      list.push(b);
      bySession.set(b.session_id, list);
    }

    return json({
      today,
      pending: pendingRes.data ?? [],
      privateConfirmed: privateRes.data ?? [],
      sessions: (sessionsRes.data ?? []).map((s) => ({ ...s, bookings: bySession.get(s.id) ?? [] })),
    });
  } catch {
    return json({ error: 'Internal server error' }, 500);
  }
};
