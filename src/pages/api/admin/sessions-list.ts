import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// GET /api/admin/sessions-list
// Returns all sessions for the next 30 days with available spots
export const GET: APIRoute = async ({ cookies }) => {
  // Verify admin auth via cookie
  const adminToken = cookies.get('admin_token')?.value;
  if (!adminToken || adminToken !== import.meta.env.ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date().toISOString();
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, start_time, tour_type, available_spots, max_spots')
      .gte('start_time', now)
      .lte('start_time', thirtyDaysLater)
      .order('start_time', { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ sessions: sessions || [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
