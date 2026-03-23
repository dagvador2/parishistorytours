// Vercel Edge Middleware — compiled separately from Astro, always deploys fresh.
// Two jobs:
// 1. Inject timezone cookie script into HTML pages
// 2. Rewrite /api/sessions/:date to correct the UTC date offset

export default async function middleware(request) {
  const url = new URL(request.url);

  // --- JOB 2: Rewrite session date API calls ---
  const match = url.pathname.match(/^\/api\/sessions\/(\d{4}-\d{2}-\d{2})$/);
  if (match) {
    const date = match[1];
    const cookies = parseCookies(request.headers.get('cookie') || '');
    const tzOffset = parseInt(cookies['tz'] || '0');

    if (tzOffset < 0) {
      // Client is east of UTC — sent date is 1 day behind
      const adjusted = new Date(`${date}T12:00:00.000Z`);
      adjusted.setUTCDate(adjusted.getUTCDate() + 1);
      const correctedDate = adjusted.toISOString().split('T')[0];

      const newUrl = new URL(request.url);
      newUrl.pathname = `/api/sessions/${correctedDate}`;
      return fetch(newUrl.toString(), {
        headers: request.headers,
        method: request.method,
      });
    }
    // No adjustment needed — pass through
    return fetch(request);
  }

  // --- JOB 1: Inject tz cookie script into HTML responses ---
  const response = await fetch(request);
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/html')) {
    const body = await response.text();
    const tzScript = '<script>document.cookie="tz="+new Date().getTimezoneOffset()+";path=/;SameSite=Lax;max-age=86400";</script>';
    const modified = body.replace('</head>', tzScript + '</head>');

    return new Response(modified, {
      status: response.status,
      headers: response.headers,
    });
  }

  return response;
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
}

export const config = {
  matcher: ['/((?!_astro|_vercel|fonts|photos|logos|favicon).*)'],
};
