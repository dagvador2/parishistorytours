import type { APIRoute } from 'astro';
import { runThanks } from '../../../lib/scheduled-emails';
import { authorizeCron, cronResponse } from '../../../lib/cron-auth';

// GET /api/cron/thanks — Vercel cron, "0 7,8 * * *" (UTC).
// Same two-hour trick as the reminder: the run proceeds only at 09:00 Paris.
export const GET: APIRoute = async ({ request, cookies, url }) => {
  const denied = authorizeCron(request, cookies);
  if (denied) return denied;
  return cronResponse(await runThanks(forcedNow(url)));
};

/** `?force=1`, admin-only, runs the job whatever the clock says. */
function forcedNow(url: URL): Date {
  if (url.searchParams.get('force') !== '1') return new Date();
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + (9 - Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(now))));
  return now;
}
