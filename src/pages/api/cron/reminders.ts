import type { APIRoute } from 'astro';
import { runReminders } from '../../../lib/scheduled-emails';
import { authorizeCron, cronResponse } from '../../../lib/cron-auth';

// GET /api/cron/reminders — Vercel cron, "0 16,17 * * *" (UTC).
// Fires on both candidate hours; the run itself only proceeds at 18:00 Paris,
// so the reminder stays at 6 pm local on either side of the DST switch.
export const GET: APIRoute = async ({ request, cookies, url }) => {
  const denied = authorizeCron(request, cookies);
  if (denied) return denied;
  return cronResponse(await runReminders(forcedNow(url)));
};

/** `?force=1`, admin-only, runs the job whatever the clock says. */
function forcedNow(url: URL): Date {
  if (url.searchParams.get('force') !== '1') return new Date();
  const now = new Date();
  // Pretend it is 18:00 Paris so the hour guard lets this manual run through.
  now.setUTCHours(now.getUTCHours() + (18 - Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(now))));
  return now;
}
