import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// POST /api/admin/generate-sessions
// Generates sessions for the next N weeks based on a weekly schedule.
// Body: {
//   weeksAhead: number (1-8),
//   schedule: Array<{ dayOfWeek: number (0=Sun..6=Sat), times: string[], tour: string }>,
//   maxSpots: number (default 10)
// }

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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Generate dates for each week
    for (let week = 0; week < weeksAhead; week++) {
      for (const entry of schedule) {
        const { dayOfWeek, times, tour } = entry;

        if (!times || !Array.isArray(times) || !tour) continue;
        if (dayOfWeek < 0 || dayOfWeek > 6) continue;

        // Find the next occurrence of this dayOfWeek in this week
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() + week * 7);

        // Move to the correct day of the week
        const currentDay = weekStart.getDay();
        let daysToAdd = dayOfWeek - currentDay;
        if (daysToAdd < 0) daysToAdd += 7;
        // For week 0, skip days that are already past
        if (week === 0 && daysToAdd === 0) {
          // Today: still valid if there are future time slots
        } else if (week === 0 && daysToAdd < 0) {
          continue; // Skip past days in the current week
        }

        const targetDate = new Date(weekStart);
        targetDate.setDate(targetDate.getDate() + daysToAdd);

        // Skip dates in the past
        if (targetDate < today) continue;

        for (const time of times) {
          const [hours, minutes] = time.split(':').map(Number);
          const startTime = new Date(targetDate);
          startTime.setHours(hours, minutes, 0, 0);

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

    const newSessions = sessionsToCreate.filter(
      (s) => !existingSet.has(`${s.tour_type}_${s.start_time}`)
    );

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
