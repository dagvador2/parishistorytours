import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { parisDateKey } from '../../lib/paris-time';

export const GET: APIRoute = async ({ url }) => {
  const tour = url.searchParams.get('tour'); // optional — omit to get all tours
  const participants = parseInt(url.searchParams.get('participants') || '1');
  // ?upcoming=N → return the next N bookable slots (soonest first) instead of
  // the availableDays map. Powers the "Next available dates" quick-pick list
  // in the booking wizard and the "Next date · spots left" lines on tour cards.
  const upcoming = parseInt(url.searchParams.get('upcoming') || '0');

  try {
    let query = supabase
      .from('sessions')
      .select('id, start_time, available_spots, tour_type')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

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

    if (upcoming > 0) {
      const slots = (data || [])
        .filter((slot) => slot.available_spots >= participants)
        .slice(0, Math.min(upcoming, 50))
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
    }

    // Group available days
    // Keyed on the Paris calendar day, not the UTC one — an evening slot must
    // light up the day the walk actually happens in Paris.
    const availableDays: Record<string, number> = {};
    data?.forEach((slot) => {
      const date = parisDateKey(slot.start_time);
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
