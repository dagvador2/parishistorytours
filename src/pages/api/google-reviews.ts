// Server endpoint that fetches Google Place Details (reviews) and returns a small normalized payload.
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  try {
  // Prefer process.env at runtime (dev server) but fall back to import.meta.env
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY || import.meta.env.GOOGLE_PLACES_API_KEY;
  const PLACE_ID = process.env.GOOGLE_PLACE_ID || import.meta.env.GOOGLE_PLACE_ID;

    if (!API_KEY || !PLACE_ID) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), { status: 500 });
    }

  // Debug: log whether we have an API key and which source (process.env vs import.meta.env)
  const keySource = process.env.GOOGLE_PLACES_API_KEY ? 'process.env' : (import.meta.env.GOOGLE_PLACES_API_KEY ? 'import.meta.env' : 'none');
  console.debug('[google-reviews] API key source:', keySource, 'key length:', (API_KEY && API_KEY.length) || 0);

  // Use the newer Places API v1 endpoint (works with places.googleapis.com)
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE_ID)}?fields=reviews,displayName&key=${encodeURIComponent(
      API_KEY
    )}`;

    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      console.error('Google Places error', res.status, text);
      // return the underlying error message for easier debugging (no secrets)
      return new Response(JSON.stringify({ error: 'Google Places API error', status: res.status, body: text }), { status: 502 });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Google response', e, text);
      return new Response(JSON.stringify({ error: 'Invalid response from Google Places' }), { status: 502 });
    }

    // Normalize reviews from either the legacy "result.reviews" or v1 top-level "reviews"
    const reviewsRaw = (data.result && data.result.reviews) || data.reviews || [];
    const reviews = reviewsRaw.map((r: any) => {
      // Attempt to map multiple possible shapes returned by different Google APIs
      const name = r.author_name || r.authorDisplayName || r.author_display_name || r.author || r.name || 'Anonymous';
  const rating = r.rating || r.stars || null;
  // text can be an object in v1 { text: '...' , languageCode } or plain string
  let textBody: string = '';
  if (!r) textBody = '';
  else if (typeof r.text === 'string') textBody = r.text;
  else if (r.text && typeof r.text === 'object' && r.text.text) textBody = r.text.text;
  else if (typeof r.review === 'string') textBody = r.review;
  else if (r.review && typeof r.review === 'object' && r.review.text) textBody = r.review.text;
  else if (typeof r.content === 'string') textBody = r.content;
  else if (typeof r.comment === 'string') textBody = r.comment;
  else textBody = '';

  // time could be unix seconds (r.time) or publish/create ISO string (publishTime / r.create_time / r.createTime)
  let time: number | null = null;
  if (r.time) time = Number(r.time);
  else if (r.publishTime) time = Date.parse(r.publishTime) / 1000;
  else if (r.create_time) time = Date.parse(r.create_time) / 1000;
  else if (r.createTime) time = Date.parse(r.createTime) / 1000;

  // author/profile fields in v1: authorAttribution.displayName, authorAttribution.photoUri
  const profile = r.profile_photo_url || r.profilePhotoUrl || r.profile_photo || (r.authorAttribution && r.authorAttribution.photoUri) || null;
  const authorFromAttr = (r.authorAttribution && r.authorAttribution.displayName) || null;

      return {
        name: authorFromAttr || name,
        rating,
        text: textBody,
        time,
        profile_photo_url: profile,
      };
    });

    return new Response(JSON.stringify({ reviews }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Failed to fetch google reviews', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
