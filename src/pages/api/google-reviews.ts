// Server endpoint that fetches Google Place Details (reviews) and returns a small normalized payload.
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  try {
  const API_KEY = import.meta.env.GOOGLE_PLACES_API_KEY;
  const PLACE_ID = import.meta.env.GOOGLE_PLACE_ID;

    if (!API_KEY || !PLACE_ID) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), { status: 500 });
    }

  // Use the newer Places API v1 endpoint (works with places.googleapis.com)
    // Request reviews (displayName). Do not request user_ratings_total here — v1 may not support it and will return 400.
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE_ID)}?fields=reviews,displayName&key=${encodeURIComponent(
      API_KEY
    )}`;

    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      console.error('Google Places error', res.status);
      return new Response(JSON.stringify({ error: 'Google Places API error', status: res.status }), { status: 502 });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Google response');
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
    // Try to extract overall rating and total reviews from known fields (v1 may not expose these)
    let overallRating: number | null = null;
    let totalReviews: number | null = null;
    if (typeof data.rating === 'number') overallRating = data.rating;
    if (data.user_ratings_total) totalReviews = Number(data.user_ratings_total);
    if (data.result) {
      if (typeof data.result.rating === 'number') overallRating = data.result.rating;
      if (data.result.user_ratings_total) totalReviews = Number(data.result.user_ratings_total);
    }

    // If v1 didn't provide rating/total, try the legacy Place Details endpoint server-side to get metadata
    if ((overallRating === null || totalReviews === null) && API_KEY && PLACE_ID) {
      try {
        const legacyUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(PLACE_ID)}&fields=rating,user_ratings_total&key=${encodeURIComponent(API_KEY)}`;
        const legacyRes = await fetch(legacyUrl);
        const legacyText = await legacyRes.text();
        if (legacyRes.ok) {
          const legacy = JSON.parse(legacyText);
          if (legacy && legacy.result) {
            if (typeof legacy.result.rating === 'number') overallRating = legacy.result.rating;
            if (legacy.result.user_ratings_total) totalReviews = Number(legacy.result.user_ratings_total);
          }
        }
      } catch (e) {
        // Legacy fallback failed silently — v1 data is still returned
      }
    }

    return new Response(JSON.stringify({ reviews, total: totalReviews, average_rating: overallRating }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Failed to fetch google reviews');
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
