/**
 * Map the words of a script onto the words of a spoken take.
 *
 * The letter-stream alignment in align.ts assumes both sides spell things the
 * same way, which holds for the TTS (Fish reads the script verbatim) but not
 * for a human recording: the script spells numbers out for the voice
 * ("soixante", "mille neuf cent quarante-quatre") while the transcription
 * writes them as digits ("60", "1944"), and the take itself drifts a word here
 * and there. Those differences do not cancel out — they accumulate, and the
 * subtitles slide further behind with every one of them.
 *
 * So instead of assuming the streams are identical, align them: a longest
 * common subsequence pairs the script's words with the spoken words, and the
 * words that did not pair are interpolated between their neighbours. Drift
 * stays local to the passage that actually differs.
 */
import type { FishWord } from "./fish.ts";
import { letterStream } from "./fish.ts";
import { toDisplayText } from "./numbers.ts";
import type { Lang } from "./sections.ts";

export interface ScriptWord {
  /** character index of the word in the text it came from */
  charIndex: number;
  text: string;
}

/**
 * Words of `text` with their character offsets, split the way a transcription
 * tokenises them: on hyphens ("Saint-Michel" -> "Saint", "Michel") and on
 * elisions ("l'armée" -> "l", "armée"). Both are single tokens in the script
 * and two in the transcript, and French prose is full of them — left joined,
 * a quarter of the script fails to pair and the health metric is meaningless.
 */
export function scriptWords(text: string): ScriptWord[] {
  const out: ScriptWord[] = [];
  const re = /\S+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const token = m[0];
    if (!/[\p{L}\p{N}]/u.test(token)) continue;
    let at = 0;
    for (const part of token.split(/[-\u2010\u2011'\u2018\u2019]/)) {
      if (/[\p{L}\p{N}]/u.test(part)) out.push({ charIndex: m.index + at, text: part });
      at += part.length + 1; // the separator
    }
  }
  return out;
}

/**
 * Small cardinals, which `toDisplayText` deliberately leaves in words ("trois
 * arrondissements" reads better than "3 arrondissements") while a
 * transcription writes them as digits. Matching is not display, so here they
 * are folded too — otherwise every "quatre" / "4" counts as a divergence and
 * the match rate stops meaning anything.
 */
const SMALL_CARDINALS: Record<string, string> = {
  un: "1", une: "1", deux: "2", trois: "3", quatre: "4", cinq: "5", six: "6", sept: "7", huit: "8", neuf: "9",
  one: "1", two: "2", three: "3", four: "4", five: "5", six_en: "6", seven: "7", eight: "8", nine: "9",
};

/**
 * Comparison key: letters and digits only, with spelled-out numbers written as
 * digits so "soixante" matches "60". Hyphenated compounds are already split by
 * `scriptWords`, so "Saint-Michel" pairs with the transcription's two tokens.
 */
function key(word: string, lang: Lang): string {
  const k = letterStream(toDisplayText(word, lang).text);
  return SMALL_CARDINALS[k] ?? k;
}

/** Indices of the LCS pairs between two token streams. */
function lcsPairs(a: string[], b: string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; }
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  return pairs;
}

/**
 * Start time for every word of `words`, in the timeline of `spoken`.
 * Unpaired words are spread evenly between the surrounding paired ones; before
 * the first and after the last pair, the nearest pair's time is used.
 */
export function wordTimes(words: ScriptWord[], spoken: FishWord[], lang: Lang): number[] {
  const times = new Array<number>(words.length).fill(0);
  if (words.length === 0 || spoken.length === 0) return times;

  const pairs = lcsPairs(words.map((w) => key(w.text, lang)), spoken.map((w) => key(w.text, lang)));
  if (pairs.length === 0) {
    // nothing matched: fall back to spreading the script over the take
    const span = spoken.at(-1)!.end - spoken[0]!.start;
    return words.map((_, i) => spoken[0]!.start + (span * i) / words.length);
  }

  for (const [i, j] of pairs) times[i] = spoken[j]!.start;

  const anchored = pairs.map(([i]) => i);
  // before the first anchor
  for (let i = 0; i < anchored[0]!; i++) times[i] = times[anchored[0]!]!;
  // between anchors
  for (let k = 0; k + 1 < anchored.length; k++) {
    const a = anchored[k]!;
    const b = anchored[k + 1]!;
    if (b - a <= 1) continue;
    const t0 = times[a]!;
    const t1 = times[b]!;
    for (let i = a + 1; i < b; i++) times[i] = t0 + ((t1 - t0) * (i - a)) / (b - a);
  }
  // after the last anchor
  const last = anchored.at(-1)!;
  const tail = spoken.at(-1)!.end;
  for (let i = last + 1; i < words.length; i++) {
    times[i] = times[last]! + ((tail - times[last]!) * (i - last)) / (words.length - last);
  }
  // monotonic, defensively
  for (let i = 1; i < times.length; i++) if (times[i]! < times[i - 1]!) times[i] = times[i - 1]!;
  return times;
}

/** Share of the script's words that paired with a spoken word. */
export function matchRate(words: ScriptWord[], spoken: FishWord[], lang: Lang): number {
  if (!words.length) return 1;
  return lcsPairs(words.map((w) => key(w.text, lang)), spoken.map((w) => key(w.text, lang))).length / words.length;
}
