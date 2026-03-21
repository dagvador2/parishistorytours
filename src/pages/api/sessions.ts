import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const tour = url.searchParams.get('tour'); // optional — omit to get all tours
  const participants = parseInt(url.searchParams.get('participants') || '1');

  try {
    let query = supabase
      .from('sessions')
      .select('id, start_time, available_spots, tour_type')
      .gte('start_time', new Date().toISOString());

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

    // Group available days
    const availableDays: Record<string, number> = {};
    data?.forEach((slot) => {
      const date = new Date(slot.start_time).toISOString().split('T')[0];
      if (slot.available_spots >= participants) {
        availableDays[date] = (availableDays[date] || 0) + 1;
      }
    });

    return new Response(JSON.stringify({ availableDays }), {
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
