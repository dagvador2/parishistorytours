/**
 * The one check every /api/admin/* route and the dashboard itself perform.
 *
 * The admin cookie holds the password verbatim and is compared to
 * ADMIN_PASSWORD; there is no session table. Three routes used to carry their
 * own copy of this comparison, which is three places to get it subtly wrong.
 */
import type { AstroCookies } from 'astro';

export function isAdmin(cookies: AstroCookies): boolean {
  const password = import.meta.env.ADMIN_PASSWORD;
  const token = cookies.get('admin_token')?.value;
  return Boolean(password) && token === password;
}

export function unauthorized(): Response {
  return new Response('Unauthorized', { status: 401 });
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
