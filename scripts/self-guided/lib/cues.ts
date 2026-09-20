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
  /**
   * Seconds added to the anchored sentence's own time. Sentences are the
   * finest anchor the scripts offer, so a run of photos meant to change every
   * few seconds inside one long sentence is placed with +2, +4, +6…
   * A negative value pulls a cue earlier (−99 on the first cue of a section
   * means "from the first frame"); the result is clamped to 0.
   */
  offsetSec?: number;
  /** CSS `object-position` for the image well; omitted means "50% 50%". */
  pos?: string;
  /**
   * Turns this cue into the live route map: the player draws the walk over the
   * photo itself, on the audio clock. Each beat names the stop that lights up
   * and the phrase, in this section's narration, at which it does.
   */
  route?: MediaCueRouteBeat[];
  /**
   * Turns this cue into the live map of the May 1940 offensive: the player
   * draws the arrows over the photo itself, on the audio clock. Each beat
   * names a move of `src/data/self-guided/offensive-1940.ts` and the phrase,
   * in this section's narration, at which it happens.
   */
  offensive?: MediaCueCampaignBeat[];
  /**
   * The same, for the 1944 map of the Allied advance — Normandy, Paris, Berlin
   * — whose moves are in `src/data/self-guided/strategic-1944.ts`.
   */
  strategic?: MediaCueCampaignBeat[];
}

export interface MediaCueRouteBeat {
  /** section id of the stop, e.g. "03-fall-of-paris" */
  stop: string;
  /** phrase in the narration at which that point lights up */
  find: string;
  /** seconds added to the phrase, to spread points named in one breath */
  offset?: number;
  /** medallion photo; omitted means the dot lights without one */
  img?: string;
  cap?: string;
}
export interface MediaCueCampaignBeat {
  /** move id in that map's table, e.g. "ard" (1940) or "bypass" (1944) */
  move: string;
  /** phrase in the narration at which that move happens */
  find: string;
  /** seconds added to the phrase, to spread moves named in one breath */
  offset?: number;
  /** photo for a move that pins one into the frame (the Gamelin portrait) */
  img?: string;
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
