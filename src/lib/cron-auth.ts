/**
 * Guard for the scheduled-email endpoints.
 *
 * Two ways in, and no third: the `Authorization: Bearer $CRON_SECRET` header
 * Vercel sends with a cron invocation, or the admin cookie the dashboard
 * already sets — the second one so these jobs can be triggered by hand
 * without waiting for the hour to come round.
 *
 * If `CRON_SECRET` is unset the endpoint refuses everything rather than
 * falling open: an unauthenticated URL here mails every customer of a given
 * day, to anyone who guesses the path.
 */
import type { AstroCookies } from 'astro';
import type { RunReport } from './scheduled-emails';

function env(key: string): string | undefined {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return viteEnv?.[key] ?? process.env[key];
}

/** Returns a Response when the caller is refused, or null when it may proceed. */
export function authorizeCron(request: Request, cookies: AstroCookies): Response | null {
  const secret = env('CRON_SECRET');
  const adminPassword = env('ADMIN_PASSWORD');

  const bearer = request.headers.get('authorization');
  if (secret && bearer === `Bearer ${secret}`) return null;

  const adminToken = cookies.get('admin_token')?.value;
  if (adminPassword && adminToken === adminPassword) return null;

  if (!secret && !adminPassword) {
    console.error('Cron endpoint called but neither CRON_SECRET nor ADMIN_PASSWORD is set');
  }
  return new Response('Unauthorized', { status: 401 });
}

export function cronResponse(report: RunReport): Response {
  const status = report.failed.length > 0 ? 500 : 200;
  return new Response(JSON.stringify(report, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
