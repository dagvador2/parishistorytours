/**
 * Narration text handling: paragraphs, sentences, subtitle-sized pieces and
 * paragraph grouping into TTS requests.
 *
 * The narration scripts are "audio-ready": one paragraph per blank-line block,
 * no digits, no abbreviations with inner periods. Sentence boundaries are
 * therefore simple: terminal punctuation, optional closing quote, whitespace,
 * then an upper-case letter or an opening quote.
 */

export interface Sentence {
  /** spoken text exactly as sent to the TTS */
  text: string;
  /** character offset of the sentence start within its paragraph */
  offset: number;
}

export function splitParagraphs(script: string): string[] {
  return script
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const TERMINAL = new Set([".", "!", "?", "…"]);
const CLOSERS = new Set(['"', "”", "»", "’", "'"]);
const OPENERS = new Set(['"', "“", "«", "(", "‘", "'"]);

export function splitSentences(paragraph: string): Sentence[] {
  const out: Sentence[] = [];
  let start = 0;
  let i = 0;
  const n = paragraph.length;
  while (i < n) {
    const ch = paragraph[i]!;
    if (!TERMINAL.has(ch)) {
      i++;
      continue;
    }
    // swallow repeated terminals ("?!", "...")
    let j = i + 1;
    while (j < n && TERMINAL.has(paragraph[j]!)) j++;
    // optional closing quote, possibly after a French thin space (". »")
    if (j < n && CLOSERS.has(paragraph[j]!)) j++;
    else if (j + 1 < n && /\s/.test(paragraph[j]!) && (paragraph[j + 1] === "»" || paragraph[j + 1] === "”")) j += 2;
    // need whitespace then an upper-case letter (or opener + upper-case)
    let k = j;
    while (k < n && /\s/.test(paragraph[k]!)) k++;
    if (k === j || k >= n) {
      i = j;
      if (k >= n) break;
      continue;
    }
    let first = paragraph[k]!;
    if (OPENERS.has(first)) {
      // French typography puts a space inside the quote — « Comme ceci » — so
      // the letter that decides the split sits two characters on, not one.
      let m = k + 1;
      while (m < n && /\s/.test(paragraph[m]!)) m++;
      first = paragraph[m] ?? "";
    }
    if (/\p{Lu}/u.test(first)) {
      const text = paragraph.slice(start, j).trim();
      if (text) out.push({ text, offset: start });
      start = k;
    }
    i = j;
  }
  const tail = paragraph.slice(start).trim();
  if (tail) out.push({ text: tail, offset: start });
  return out;
}

/**
 * Subtitle pieces: the design shows one sentence at a time with a font size
 * that shrinks above 110 / 170 chars. Sentences longer than `max` are split at
 * the em dash / semicolon / colon closest to the middle, recursively; commas
 * are a last resort when both halves stay readable.
 */
export function splitLongSentence(text: string, max = 170): string[] {
  if (text.length <= max) return [text];
  const candidates: { idx: number; len: number }[] = [];
  for (const sep of [" — ", "; ", ": "]) {
    let from = 0;
    for (;;) {
      const idx = text.indexOf(sep, from);
      if (idx === -1) break;
      candidates.push({ idx, len: sep.length });
      from = idx + sep.length;
    }
  }
  const middle = text.length / 2;
  const pick = (list: { idx: number; len: number }[]) =>
    list.filter((c) => c.idx >= 40 && text.length - (c.idx + c.len) >= 40).sort((a, b) => Math.abs(a.idx - middle) - Math.abs(b.idx - middle))[0];
  let best = pick(candidates);
  if (!best) {
    const commas: { idx: number; len: number }[] = [];
    let from = 0;
    for (;;) {
      const idx = text.indexOf(", ", from);
      if (idx === -1) break;
      commas.push({ idx, len: 2 });
      from = idx + 2;
    }
    best = pick(commas);
  }
  if (!best) return [text];
  // keep the separator glyph with the first half (": ", "; ", " —" or ",")
  const left = text.slice(0, best.idx + best.len).trimEnd();
  const right = text.slice(best.idx + best.len).trimStart();
  return [...splitLongSentence(left, max), ...splitLongSentence(right, max)];
}

/** Group consecutive paragraphs into TTS requests of at most `maxChars`. */
export function groupParagraphs(paragraphs: string[], maxChars = 1500): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  let len = 0;
  for (const p of paragraphs) {
    const add = p.length + (current.length ? 2 : 0);
    if (current.length && len + add > maxChars) {
      groups.push(current);
      current = [];
      len = 0;
    }
    current.push(p);
    len += add;
  }
  if (current.length) groups.push(current);
  return groups;
}
