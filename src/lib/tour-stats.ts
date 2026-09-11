/**
 * The figures published on /key-figures.
 *
 * They come from two aggregate views (`public_tour_stats`,
 * `public_tour_countries`) which the anon key is allowed to read; the
 * underlying tracking tables, which hold names, phone numbers and revenue,
 * are never exposed. Both views are rebuilt from the Excel workbook by
 * `pnpm tracking:import`.
 */
import { supabase } from "./supabase";
import { COUNTRIES, countryName } from "./countries";
import { KEY_FIGURES_FALLBACK } from "../data/site";

export interface PublishedFigures {
  participants: number;
  toursConducted: number;
  kilometers: number;
  countries: number;
  firstTourOn: string | null;
  lastTourOn: string | null;
  /** True when the database was unreachable and the snapshot was served. */
  fromFallback: boolean;
}

export interface CountryCount {
  /** ISO 3166-1 alpha-2 — the flag code. */
  code: string;
  /** ISO 3166-1 numeric — the geometry id in public/data/world-110m.json. */
  numeric: string;
  name: string;
  participants: number;
}

interface StatsRow {
  participants: number;
  tours_conducted: number;
  kilometers: number;
  countries: number;
  first_tour_on: string | null;
  last_tour_on: string | null;
}

function fallback(lang: "en" | "fr"): { figures: PublishedFigures; countries: CountryCount[] } {
  return {
    figures: {
      participants: KEY_FIGURES_FALLBACK.participants,
      toursConducted: KEY_FIGURES_FALLBACK.toursConducted,
      kilometers: KEY_FIGURES_FALLBACK.kilometers,
      countries: KEY_FIGURES_FALLBACK.countries,
      firstTourOn: null,
      lastTourOn: null,
      fromFallback: true,
    },
    countries: KEY_FIGURES_FALLBACK.topCountries.map((c) => decorate(c.code, c.participants, lang)),
  };
}

function decorate(code: string, participants: number, lang: "en" | "fr"): CountryCount {
  return {
    code,
    numeric: COUNTRIES[code]?.numeric ?? "",
    name: countryName(code, lang),
    participants,
  };
}

export async function fetchPublishedFigures(
  lang: "en" | "fr",
): Promise<{ figures: PublishedFigures; countries: CountryCount[] }> {
  try {
    const [stats, countries] = await Promise.all([
      supabase.from("public_tour_stats").select("*").single(),
      supabase.from("public_tour_countries").select("code, participants").order("participants", { ascending: false }),
    ]);
    if (stats.error || !stats.data) throw stats.error ?? new Error("public_tour_stats returned no row");
    if (countries.error) throw countries.error;

    const row = stats.data as StatsRow;
    return {
      figures: {
        participants: row.participants ?? 0,
        toursConducted: row.tours_conducted ?? 0,
        kilometers: row.kilometers ?? 0,
        countries: row.countries ?? 0,
        firstTourOn: row.first_tour_on,
        lastTourOn: row.last_tour_on,
        fromFallback: false,
      },
      countries: (countries.data ?? []).map((c) => decorate(c.code as string, Number(c.participants) || 0, lang)),
    };
  } catch (err) {
    console.error("[tour-stats] falling back to the published snapshot:", err);
    return fallback(lang);
  }
}

/**
 * One paragraph of plain prose stating the same figures, for screen readers
 * and for the assistants that read the page (GEO).
 */
export function figuresSummary(
  figures: PublishedFigures,
  countries: CountryCount[],
  lang: "en" | "fr",
  rating: { ratingValue: string; ratingCount: string },
): string {
  const names = countries.slice(0, 8).map((c) => c.name).join(lang === "fr" ? ", " : ", ");
  const since = figures.firstTourOn ? new Date(figures.firstTourOn).getFullYear() : 2023;
  return lang === "fr"
    ? `Chiffres clés de Paris History Tours : ${figures.participants} participants venus de ${figures.countries} pays au fil de ${figures.toursConducted} visites guidées, soit environ ${figures.kilometers} kilomètres de marche dans le Paris historique. Les visiteurs viennent principalement de ces pays : ${names}. Depuis ${since}, Paris History Tours maintient une note de ${rating.ratingValue} sur 5 étoiles sur ${rating.ratingCount} avis Google.`
    : `Paris History Tours key statistics: ${figures.participants} participants from ${figures.countries} countries across ${figures.toursConducted} guided tours, covering about ${figures.kilometers} kilometres of walking through historic Paris. Visitors come mainly from ${names}. Since ${since}, Paris History Tours has maintained a ${rating.ratingValue} out of 5 star rating across ${rating.ratingCount} Google reviews.`;
}
