import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { parisDateKey, parisWallClockToUTC } from '../../../lib/paris-time';

// POST /api/admin/generate-sessions
// Generates sessions for the next N weeks based on a weekly schedule.
// Body: {
//   weeksAhead: number (1-8),
//   schedule: Array<{ dayOfWeek: number (0=Sun..6=Sat), times: string[], tour: string }>,
//   maxSpots: number (default 10)
// }
//
// Days and times are read as Paris wall clock, never as the server's own —
// deployed, that server runs on UTC, which would turn a "10:30" schedule into
// a 12:30 session all summer.

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verify admin auth
  const adminToken = cookies.get('admin_token')?.value;
  if (!adminToken || adminToken !== import.meta.env.ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { weeksAhead = 4, schedule, maxSpots = 10 } = await request.json();

    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Schedule is required (array of { dayOfWeek, times, tour })' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (weeksAhead < 1 || weeksAhead > 8) {
      return new Response(
        JSON.stringify({ error: 'weeksAhead must be between 1 and 8' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sessionsToCreate: Array<{
      start_time: string;
      tour_type: string;
      max_spots: number;
      available_spots: number;
    }> = [];

    const now = new Date();
    const DAY_MS = 24 * 60 * 60 * 1000;
    // Calendar arithmetic runs on a UTC-noon anchor of today's *Paris* date, so
    // adding days never lands on a DST switch, and the weekday is the Paris one.
    const [ty, tm, td] = parisDateKey(now).split('-').map(Number);
    const anchor = Date.UTC(ty, tm - 1, td, 12);

    // Generate dates for each week
    for (let week = 0; week < weeksAhead; week++) {
      for (const entry of schedule) {
        const { dayOfWeek, times, tour } = entry;

        if (!times || !Array.isArray(times) || !tour) continue;
        if (dayOfWeek < 0 || dayOfWeek > 6) continue;

        // Find the next occurrence of this dayOfWeek in this week
        const weekStart = anchor + week * 7 * DAY_MS;

        // Move to the correct day of the week
        const currentDay = new Date(weekStart).getUTCDay();
        let daysToAdd = dayOfWeek - currentDay;
        if (daysToAdd < 0) daysToAdd += 7;

        const targetDate = new Date(weekStart + daysToAdd * DAY_MS);
        const targetKey = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, '0')}-${String(targetDate.getUTCDate()).padStart(2, '0')}`;

        for (const time of times) {
          const [hours, minutes] = time.split(':').map(Number);
          if (!Number.isFinite(hours) || !Number.isFinite(minutes)) continue;
          if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) continue;

          // "10:30" means 10:30 in Paris, whatever the server's own clock says.
          const startTime = parisWallClockToUTC(
            targetKey,
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000`
          );

          // Skip times in the past (for today)
          if (startTime <= now) continue;

          sessionsToCreate.push({
            start_time: startTime.toISOString(),
            tour_type: tour,
            max_spots: maxSpots,
            available_spots: maxSpots,
          });
        }
      }
    }

    if (sessionsToCreate.length === 0) {
      return new Response(
        JSON.stringify({ created: 0, skipped: 0, message: 'No sessions to create with the given schedule' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing sessions to avoid duplicates
    const existingCheck = await supabase
      .from('sessions')
      .select('start_time, tour_type')
      .gte('start_time', now.toISOString());

    const existingSet = new Set(
      (existingCheck.data || []).map(
        (s: any) => `${s.tour_type}_${new Date(s.start_time).toISOString()}`
      )
    );

    // Filter against what is already stored *and* against this run's own list —
    // the sessions table has no unique key, so a slot repeated here would land
    // twice and show the customer the same 10:30 tour two rows running.
    const seen = new Set<string>();
    const newSessions = sessionsToCreate.filter((s) => {
      const key = `${s.tour_type}_${s.start_time}`;
      if (existingSet.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const skipped = sessionsToCreate.length - newSessions.length;

    if (newSessions.length === 0) {
      return new Response(
        JSON.stringify({ created: 0, skipped, message: 'All sessions already exist' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Batch insert
    const { error } = await supabase.from('sessions').insert(newSessions);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ created: newSessions.length, skipped }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
