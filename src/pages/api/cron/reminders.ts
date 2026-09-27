import type { APIRoute } from 'astro';
import { runReminders } from '../../../lib/scheduled-emails';
import { authorizeCron, cronResponse } from '../../../lib/cron-auth';

// GET /api/cron/reminders — Vercel cron, "0 17 * * *" (UTC, once a day: Hobby plan).
// 17:00 UTC is 18:00 Paris in winter, 19:00 in summer — the run itself
// checks it is somewhere in the evening.
// `?force=1` runs it now regardless of the clock — admin cookie required, the
// bearer secret alone is not enough to force.
export const GET: APIRoute = async ({ request, cookies, url }) => {
  const denied = authorizeCron(request, cookies);
  if (denied) return denied;
  const force = url.searchParams.get('force') === '1' && Boolean(cookies.get('admin_token')?.value);
  return cronResponse(await runReminders(new Date(), force));
};
