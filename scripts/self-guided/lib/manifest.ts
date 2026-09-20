/**
 * Manifest = the interface contract with the webapp (chantier B). One file per
 * language on R2 at manifest/<product>/<lang>.json. It only describes the
 * audio and what is synchronised to it; GPS / route metadata live in the
 * webapp's own config.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PATHS, PRODUCT, R2_KEYS, SECTIONS, type Lang } from "./sections.ts";

export const MANIFEST_SCHEMA_VERSION = 1;

export interface ManifestSub {
  /** seconds from the start of the section audio */
  t: number;
  /** display text (numbers as digits); the spoken text can differ slightly */
  text: string;
}
export interface ManifestMedia {
  t: number;
  /** R2 object key */
  img: string;
  cap: string;
  /** intrinsic pixel size of the WebP, to reserve layout space */
  w: number;
  h: number;
  /**
   * Present when the cue is a clip: the R2 key of an MP4 the player runs in a
   * <video>, `img` being its poster. Same box, same `pos`; the player plays it
   * with the narration and pauses it with it.
   */
  video?: string;
  /**
   * CSS `object-position` for the player's image well, when the default
   * centre crop cuts the subject (a tall portrait loses its head, a newspaper
   * loses its masthead). Omitted means "50% 50%".
   */
  pos?: string;
  /** present on the route map: the player animates it on the audio clock */
  route?: ManifestRoute;
  /** present on the May 1940 map: likewise, arrow by arrow */
  offensive?: ManifestCampaign;
  /** present on the 1944 map of the Allied advance: same drawing, other geography */
  strategic?: ManifestCampaign;
}
/**
 * A cue the player animates itself rather than showing as a still: the route
 * map. `img` is the bare basemap; the walk is drawn over it from the webapp's
 * own `ROUTE`/`STOPS`, projected with `proj`, and advanced by the audio clock —
 * so it pauses with the audio and follows a seek.
 */
export interface ManifestRouteBeat {
  /** section id of the stop that lights up */
  stop: string;
  /** seconds from the start of this cue */
  at: number;
  /** medallion photo (R2 key, then a signed URL); absent = the dot only */
  img?: string;
  cap?: string;
  w?: number;
  h?: number;
}
export interface ManifestRoute {
  /** normalised Web Mercator bounds of the basemap image */
  proj: { x0: number; x1: number; y0: number; y1: number };
  credit: string;
  beats: ManifestRouteBeat[];
}

/**
 * A campaign map — May 1940 (`offensive`) or 1944 (`strategic`) — in the same
 * arrangement as the route map: `img` is the bare basemap, the arrows come from
 * the webapp's own move tables, projected with `proj`, and each one is drawn at
 * the second it is spoken. It replaced four pre-rendered WebP loops that ran on
 * their own clock and had to restart from nothing at every step.
 */
export interface ManifestCampaignBeat {
  /** move id in the map's own table (offensive-1940.ts, strategic-1944.ts) */
  move: string;
  /** seconds from the start of this cue */
  at: number;
  /** photo pinned into the frame by this move (R2 key, then a signed URL) */
  img?: string;
  w?: number;
  h?: number;
}
export interface ManifestCampaign {
  /** normalised Web Mercator bounds of the basemap image */
  proj: { x0: number; x1: number; y0: number; y1: number };
  credit: string;
  beats: ManifestCampaignBeat[];
}

export interface ManifestSection {
  id: string;
  index: number;
  /** R2 object key */
  audio: string;
  durationSec: number;
  /** hash of the script text + voice + model that produced this audio */
  sourceHash: string;
  subs: ManifestSub[];
  media: ManifestMedia[];
}
export interface Manifest {
  schemaVersion: number;
  product: string;
  lang: Lang;
  generatedAt: string;
  voice: { provider: "fish-audio"; voiceId: string; model: string };
  totalDurationSec: number;
  sections: ManifestSection[];
}

/** Word-level sidecar, not part of the webapp contract (future karaoke). */
export interface WordsSidecar {
  product: string;
  lang: Lang;
  generatedAt: string;
  sections: Record<string, { text: string; start: number; end: number }[]>;
}

export function manifestPath(lang: Lang): string {
  return resolve(PATHS.manifestDir, `${lang}.json`);
}
export function wordsPath(lang: Lang): string {
  return resolve(PATHS.manifestDir, `${lang}.words.json`);
}

export function loadManifest(lang: Lang): Manifest | undefined {
  const p = manifestPath(lang);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Manifest) : undefined;
}
export function loadWords(lang: Lang): WordsSidecar | undefined {
  const p = wordsPath(lang);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as WordsSidecar) : undefined;
}

/**
 * Merge freshly generated sections into the existing manifest (so that
 * `--section 04-odeon` only replaces that entry) and write it, sections in
 * walk order.
 */
export function writeManifest(
  lang: Lang,
  voice: Manifest["voice"],
  fresh: ManifestSection[],
  freshWords: Record<string, WordsSidecar["sections"][string]>,
): Manifest {
  mkdirSync(PATHS.manifestDir, { recursive: true });
  const previous = loadManifest(lang);
  const byId = new Map<string, ManifestSection>((previous?.sections ?? []).map((s) => [s.id, s]));
  for (const s of fresh) byId.set(s.id, s);
  const sections = SECTIONS.map((def) => byId.get(def.id)).filter((s): s is ManifestSection => Boolean(s));
  const manifest: Manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    product: PRODUCT,
    lang,
    generatedAt: new Date().toISOString(),
    voice,
    totalDurationSec: round1(sections.reduce((a, s) => a + s.durationSec, 0)),
    sections,
  };
  writeFileSync(manifestPath(lang), JSON.stringify(manifest, null, 2) + "\n");

  const prevWords = loadWords(lang);
  const words: WordsSidecar = {
    product: PRODUCT,
    lang,
    generatedAt: manifest.generatedAt,
    sections: { ...(prevWords?.sections ?? {}), ...freshWords },
  };
  writeFileSync(wordsPath(lang), JSON.stringify(words) + "\n");
  return manifest;
}

export function missingSections(manifest: Manifest | undefined): string[] {
  const have = new Set(manifest?.sections.map((s) => s.id) ?? []);
  return SECTIONS.filter((s) => !have.has(s.id)).map((s) => s.id);
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export { R2_KEYS };
