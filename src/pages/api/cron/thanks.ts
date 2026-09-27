import type { APIRoute } from 'astro';
import { runThanks } from '../../../lib/scheduled-emails';
import { authorizeCron, cronResponse } from '../../../lib/cron-auth';

// GET /api/cron/thanks — Vercel cron, "0 8 * * *" (UTC, once a day: Hobby plan).
// Same idea: 08:00 UTC, checked against a morning window in Paris.
// `?force=1` runs it now regardless of the clock — admin cookie required, the
// bearer secret alone is not enough to force.
export const GET: APIRoute = async ({ request, cookies, url }) => {
  const denied = authorizeCron(request, cookies);
  if (denied) return denied;
  const force = url.searchParams.get('force') === '1' && Boolean(cookies.get('admin_token')?.value);
  return cronResponse(await runThanks(new Date(), force));
};
