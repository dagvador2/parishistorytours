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
    const begin = new Date(date + "T00:00:00");
    begin.setHours(0, 0, 0, 0);
    const end = new Date(date + "T00:00:00");
    end.setHours(23, 59, 59, 999);

    let query = supabase
      .from('sessions')
      .select('id, start_time, available_spots, tour_type')
      .gte('start_time', begin.toISOString())
      .lte('start_time', end.toISOString());

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
