import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
  const tzOffset = parseInt(cookies['tz'] || '0');

  return new Response(JSON.stringify({
    version: 'fd71b1a',
    cookieHeader,
    parsedTz: tzOffset,
    wouldAdjust: tzOffset < 0,
    testDate: '2026-03-27',
    adjustedDate: tzOffset < 0 ? '2026-03-28' : '2026-03-27',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
