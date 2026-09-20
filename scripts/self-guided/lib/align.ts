/**
 * Map sentence boundaries onto Fish word timestamps.
 *
 * Fish tokenises slightly differently from us ("left-hand" becomes two words,
 * "l'Odéon" stays one), so we do not align word-to-word. Both sides are
 * reduced to a stream of letters+digits; a sentence starting at letter offset
 * `o` in the text starts at the timestamp of the word covering `o`.
 */
import type { FishWord } from "./fish.ts";
import { letterStream } from "./fish.ts";
import { scriptWords, wordTimes } from "./wordmap.ts";
import type { Lang } from "./sections.ts";

export interface TimedSpan {
  /** letter offset of the span start in the chunk's letter stream */
  letterOffset: number;
  /** seconds, local to the chunk audio */
  t: number;
}

/** Cumulative letter offsets of each word in the chunk. */
export function wordLetterOffsets(words: FishWord[]): number[] {
  const offsets: number[] = [];
  let acc = 0;
  for (const w of words) {
    offsets.push(acc);
    acc += letterStream(w.text).length;
  }
  return offsets;
}

/**
 * Start time of the text span beginning at `letterOffset`.
 * Picks the word whose letter range contains the offset; if the streams have
 * drifted (Fish dropped/added a token) the nearest word start is used.
 */
export function timeAtLetterOffset(words: FishWord[], offsets: number[], letterOffset: number): number {
  if (words.length === 0) return 0;
  if (letterOffset <= 0) return words[0]!.start;
  // binary search for the last word whose offset <= letterOffset
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid]! <= letterOffset) lo = mid;
    else hi = mid - 1;
  }
  // if the offset falls in the second half of a word, snap to the next word
  const wordLen = letterStream(words[lo]!.text).length;
  const into = letterOffset - offsets[lo]!;
  if (into > wordLen / 2 && lo + 1 < words.length) lo++;
  return words[lo]!.start;
}

/**
 * Start time of `phrase` in a word stream, searching from `from` seconds.
 *
 * Used to hang the route map's beats on the narration: a place lights up when
 * it is named. Numbers are the one trap — the transcript writes "60" where the
 * script says "soixante" — so a phrase must avoid them.
 */
export function timeOfPhrase(words: FishWord[], phrase: string, from: number): number | undefined {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  const needle = norm(phrase);
  if (!needle) return undefined;
  for (let i = 0; i < words.length; i++) {
    if (words[i]!.start < from) continue;
    let acc = "";
    for (let j = i; j < words.length && acc.length < needle.length; j++) acc += norm(words[j]!.text);
    if (acc.startsWith(needle)) return words[i]!.start;
  }
  return undefined;
}

/**
 * Index of the first character of `text` that carries a letter or digit.
 *
 * A sentence opening on punctuation — « Ici est tombé… — has no letters at its
 * start, so its character offset reduces to the same letter offset as the end
 * of the sentence before it, and the subtitle lands a word early. Aiming at the
 * first letter instead costs nothing and fixes every quoted sentence.
 */
export function firstLetterIndex(text: string): number {
  for (let i = 0; i < text.length; i++) if (letterStream(text[i]!).length) return i;
  return 0;
}

/** Letter offset (in the letter stream) of character index `charIndex` of `text`. */
export function letterOffsetAt(text: string, charIndex: number): number {
  return letterStream(text.slice(0, charIndex)).length;
}


/**
 * Time of a character position inside one chunk of script. Two strategies,
 * because the two voices produce different word streams:
 *
 *  - `letterTimer` for the TTS, which reads the script verbatim: both sides
 *    reduce to the same letters, so a letter offset locates the word.
 *  - `spokenTimer` for a recording, where the transcription writes numbers as
 *    digits and the take drifts a word here and there: the streams are aligned
 *    word by word instead (see wordmap.ts), so those differences stay local.
 */
export interface ChunkTimer {
  at(charIndex: number): number;
}

export function letterTimer(chunkText: string, words: FishWord[]): ChunkTimer {
  const offsets = wordLetterOffsets(words);
  return { at: (charIndex) => timeAtLetterOffset(words, offsets, letterOffsetAt(chunkText, charIndex)) };
}

export function spokenTimer(chunkText: string, words: FishWord[], lang: Lang): ChunkTimer {
  const script = scriptWords(chunkText);
  const times = wordTimes(script, words, lang);
  return {
    at(charIndex) {
      if (script.length === 0) return 0;
      if (charIndex <= script[0]!.charIndex) return times[0]!;
      let lo = 0;
      let hi = script.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (script[mid]!.charIndex <= charIndex) lo = mid;
        else hi = mid - 1;
      }
      return times[lo]!;
    },
  };
}
