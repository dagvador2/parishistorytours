import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ params, url }) => {
  const date = params.date;
  const tour = url.searchParams.get('tour'); // optional — omit to get all tours
  const participants = parseInt(url.searchParams.get('participants') || '1');

  if (!date) {
    return new Response(JSON.stringify({ error: 'Missing date parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // The client may send a UTC date that's 1 day behind the intended local date
    // (e.g. clicking March 28 in CET sends "2026-03-27" because toISOString() is UTC).
    // We query both the requested date AND the next day, then return whichever
    // matches an availableDays key from /api/sessions (UTC-grouped dates).
    const beginISO = `${date}T00:00:00.000Z`;
    const nextDay = new Date(`${date}T12:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const nextDateStr = nextDay.toISOString().split('T')[0];
    const endISO = `${nextDateStr}T23:59:59.999Z`;

    let query = supabase
      .from('sessions')
      .select('id, start_time, available_spots, tour_type')
      .gte('start_time', beginISO)
      .lte('start_time', endISO);

    if (tour) {
      query = query.eq('tour_type', tour);
    }

    const { data, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Group results by UTC date (same logic as /api/sessions)
    const byDate: Record<string, typeof data> = {};
    (data || []).forEach((slot) => {
      const d = new Date(slot.start_time).toISOString().split('T')[0];
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(slot);
    });

    // Prefer the requested date; fall back to next day (timezone compensation)
    const matchedSlots = byDate[date] || byDate[nextDateStr] || [];

    const slots = matchedSlots
      .filter((slot) => slot.available_spots >= participants)
      .map((slot) => ({
        id: slot.id,
        start_time: slot.start_time,
        free: slot.available_spots,
        tour_type: slot.tour_type,
      }));

    return new Response(JSON.stringify({ slots }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
