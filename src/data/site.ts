// Single source of truth for site-wide facts reused across JSON-LD blocks.
// Review figures come from the Google Business Profile — update here (only)
// when the live count meaningfully changes.
export const GOOGLE_REVIEWS = {
  ratingValue: "4.9",
  bestRating: "5",
  ratingCount: "51",
} as const;

// Public Google Business Profile — target of every "read our reviews" link.
export const GOOGLE_MAPS_URL = "https://maps.app.goo.gl/AGYuzh8jHA9KXv9h8";

// Public starting prices (EUR), as displayed in the booking UI ("From €…").
// Keep in sync with the active Stripe prices.
export const TOUR_PRICES: Record<string, string> = {
  "left-bank": "59",
  "right-bank": "59",
  "general-history": "59",
  "food-wine": "119",
};

/**
 * Snapshot of the figures published on /key-figures, used only when the
 * database cannot be reached while the page renders — without it the page
 * would animate four zeros. The live values come from `public_tour_stats`.
 *
 * Refresh after a workbook import: `pnpm tracking:import` prints the current
 * figures and warns when this snapshot has drifted.
 */
export const KEY_FIGURES_FALLBACK = {
  participants: 837,
  toursConducted: 132,
  kilometers: 290,
  countries: 52,
  /** Top countries by participants, ISO 3166-1 alpha-2. */
  topCountries: [
    { code: "US", participants: 191 },
    { code: "GB", participants: 97 },
    { code: "DE", participants: 71 },
    { code: "FR", participants: 48 },
    { code: "CA", participants: 47 },
  ],
} as const;
