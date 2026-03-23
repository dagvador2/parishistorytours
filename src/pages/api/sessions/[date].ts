import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ params, url, request }) => {
  const date = params.date;
  const tour = url.searchParams.get('tour');
  const participants = parseInt(url.searchParams.get('participants') || '1');

  if (!date) {
    return new Response(JSON.stringify({ error: 'Missing date parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // The client sends toISOString().split("T")[0] of local midnight.
    // For timezones east of UTC (e.g. CET/CEST), this is 1 day behind
    // the actual calendar date the user clicked.
    //
    // We read the "tz" cookie (set by an inline script) which contains
    // getTimezoneOffset() in minutes. Negative = east of UTC.
    // If east of UTC, add 1 day to get the correct UTC session date.
    const cookies = Object.fromEntries(
      (request.headers.get('cookie') || '').split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );
    const tzOffset = parseInt(cookies['tz'] || '0');

    let targetDate = date;
    if (tzOffset < 0) {
      // Client is east of UTC — sent date is 1 day behind the clicked date
      const adjusted = new Date(`${date}T12:00:00.000Z`);
      adjusted.setUTCDate(adjusted.getUTCDate() + 1);
      targetDate = adjusted.toISOString().split('T')[0];
    }

    const beginISO = `${targetDate}T00:00:00.000Z`;
    const endISO = `${targetDate}T23:59:59.999Z`;

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

    const slots = (data || [])
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
