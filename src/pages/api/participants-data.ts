import type { APIRoute } from 'astro';
import { fetchPublishedFigures } from '../../lib/tour-stats';

/**
 * Public statistics endpoint — aggregates only.
 *
 * It used to return every row of the participants table, names included. The
 * tracking tables it now sits on top of hold phone numbers, e-mail addresses
 * and revenue, so this serves the same two aggregate views as /key-figures and
 * nothing else.
 */
export const GET: APIRoute = async ({ url }) => {
  const lang = url.searchParams.get('lang') === 'fr' ? 'fr' : 'en';
  const { figures, countries } = await fetchPublishedFigures(lang);

  return new Response(JSON.stringify({ figures, countries }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
