/**
 * Photo cues: versioned in scripts/self-guided/config/media-cues.<lang>.json,
 * produced by tools/build-media-cues.ts and hand-corrected through
 * media-cues.overrides.json. generate-audio.ts resolves each anchor to a
 * sentence of the narration script and turns it into a timestamp.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { letterStream } from "./fish.ts";
import { PATHS, type Lang } from "./sections.ts";

export interface MediaCue {
  /** photo base name, e.g. "p05_0" (photos/left-bank-ww2/p05_0.webp on R2) */
  img: string;
  cap: string;
  anchor: {
    /** 0-based paragraph index in the narration script */
    paragraph: number;
    /** first words of the target sentence, matched case/punctuation-insensitively */
    startsWith: string;
  };
}
export type MediaCuesFile = Record<string, MediaCue[]>;

export function loadMediaCues(lang: Lang): MediaCuesFile {
  return JSON.parse(readFileSync(resolve(PATHS.configDir, `media-cues.${lang}.json`), "utf8")) as MediaCuesFile;
}

/** Normalised prefix test used to resolve an anchor to a sentence. */
export function sentenceStartsWith(sentence: string, startsWith: string): boolean {
  const needle = letterStream(startsWith);
  return needle.length > 0 && letterStream(sentence).startsWith(needle);
}

/**
 * Find the sentence index inside `sentences` (the anchor's paragraph) that the
 * anchor points at. Falls back to the first sentence with a warning flag.
 */
export function resolveAnchor(sentences: string[], startsWith: string): { index: number; exact: boolean } {
  const idx = sentences.findIndex((s) => sentenceStartsWith(s, startsWith));
  if (idx !== -1) return { index: idx, exact: true };
  return { index: 0, exact: false };
}
