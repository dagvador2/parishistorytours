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
