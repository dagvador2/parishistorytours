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

/** Letter offset (in the letter stream) of character index `charIndex` of `text`. */
export function letterOffsetAt(text: string, charIndex: number): number {
  return letterStream(text.slice(0, charIndex)).length;
}
