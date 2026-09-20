/**
 * Single source of truth for the product's sections: stable ids (also used
 * as R2 object names and as the webapp's section identifiers, never rename),
 * their order, and the narration script file per language.
 */
import { resolve } from "node:path";

export const PRODUCT = "left-bank-ww2" as const;
export type Lang = "en" | "fr";
export const LANGS: Lang[] = ["en", "fr"];

export interface SectionDef {
  /** Stable kebab-case id, identical in EN and FR. */
  id: string;
  /** 0-based position along the walk; matches CONTENT[idx] in the design handoff. */
  index: number;
  /** Narration script file name per language (under scripts/audio-source/<product>/<lang>/). */
  source: Record<Lang, string>;
}

export const SECTIONS: SectionDef[] = [
  { id: "01-intro", index: 0, source: { en: "01_Intro.txt", fr: "01_Intro.txt" } },
  { id: "02-context-of-war", index: 1, source: { en: "02_Stop1_Context_of_War.txt", fr: "02_Arret1_Contexte_de_la_Guerre.txt" } },
  { id: "03-fall-of-paris", index: 2, source: { en: "03_Stop2_Fall_of_Paris.txt", fr: "03_Arret2_Chute_de_Paris.txt" } },
  { id: "04-odeon", index: 3, source: { en: "04_Interstop_Odeon.txt", fr: "04_Interstop_Odeon.txt" } },
  { id: "05-resistance", index: 4, source: { en: "05_Stop3_Resistance_Agnes_Humbert.txt", fr: "05_Arret3_Resistance_Agnes_Humbert.txt" } },
  { id: "06-sorbonne-facade", index: 5, source: { en: "06_Interstop_Sorbonne_Facade.txt", fr: "06_Interstop_Sorbonne_Facade.txt" } },
  { id: "07-observatory", index: 6, source: { en: "07_Interstop_Observatory_Tower.txt", fr: "07_Interstop_Tour_Observatoire.txt" } },
  { id: "08-saint-severin", index: 7, source: { en: "08_Interstop_Saint_Severin_Barricades.txt", fr: "08_Interstop_Saint_Severin_Barricades.txt" } },
  { id: "09-liberation", index: 8, source: { en: "09_Stop4_Liberation.txt", fr: "09_Arret4_Liberation.txt" } },
];

export function sectionById(id: string): SectionDef {
  const s = SECTIONS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown section id "${id}". Known: ${SECTIONS.map((x) => x.id).join(", ")}`);
  return s;
}

export function parseLangs(arg: string | undefined): Lang[] {
  if (!arg || arg === "both") return LANGS;
  if (arg === "en" || arg === "fr") return [arg];
  throw new Error(`--lang must be en, fr or both (got "${arg}")`);
}

// Paths (relative to the repo root = cwd when run through pnpm)
const ROOT = resolve(process.cwd());
export const PATHS = {
  root: ROOT,
  sourceDir: resolve(ROOT, "scripts/audio-source", PRODUCT),
  handoffDir: resolve(ROOT, "design/audioguide-handoff"),
  configDir: resolve(ROOT, "scripts/self-guided/config"),
  outputDir: resolve(ROOT, "scripts/self-guided/output"),
  cacheDir: resolve(ROOT, "scripts/self-guided/output/cache"),
  audioDir: resolve(ROOT, "scripts/self-guided/output/audio"),
  manifestDir: resolve(ROOT, "scripts/self-guided/output/manifest"),
  photosDir: resolve(ROOT, "scripts/self-guided/output/photos"),
  previewDir: resolve(ROOT, "scripts/self-guided/output/preview"),
};

export function scriptPath(section: SectionDef, lang: Lang): string {
  return resolve(PATHS.sourceDir, lang, section.source[lang]);
}
export function pdfMasterPath(lang: Lang): string {
  return resolve(PATHS.sourceDir, "pdf", lang, "master.pdf");
}

// R2 object keys: the bucket layout is part of the webapp contract
export const R2_KEYS = {
  audio: (lang: Lang, id: string) => `audio/${PRODUCT}/${lang}/${id}.mp3`,
  manifest: (lang: Lang) => `manifest/${PRODUCT}/${lang}.json`,
  words: (lang: Lang) => `manifest/${PRODUCT}/${lang}.words.json`,
  pdf: (lang: Lang) => `pdf/${PRODUCT}/${lang}/master.pdf`,
  photo: (name: string) => `photos/${PRODUCT}/${name}.webp`,
  /** the MP4 of a cue that is a clip; its `photo` key is the poster */
  clip: (name: string) => `photos/${PRODUCT}/${name}.mp4`,
  previewAudio: (lang: Lang) => `preview/${PRODUCT}/${lang}/intro-30s.mp3`,
  /** the itinerary passage of the intro, the one the product page animates its map on */
  previewItinerary: (lang: Lang) => `preview/${PRODUCT}/${lang}/itinerary.mp3`,
  previewPdf: (lang: Lang) => `preview/${PRODUCT}/${lang}/pdf-preview.pdf`,
  /** off-site copy of a source file the webapp never serves (see `--only masters`) */
  master: (rel: string) => `masters/${PRODUCT}/${rel}`,
};
