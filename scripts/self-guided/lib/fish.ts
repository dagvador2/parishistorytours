/**
 * Fish Audio TTS client, timestamps edition.
 *
 * Endpoint: POST https://api.fish.audio/v1/tts/stream/with-timestamp
 * Docs:     https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech-stream-with-timestamps
 *
 * The response is a Server-Sent-Events stream. Every event carries a base64
 * audio chunk plus the *latest cumulative* word-alignment snapshot for its
 * `chunk_seq`, with times local to that chunk; `chunk_audio_offset_sec`
 * places the chunk on the global timeline. Long inputs are split by the server
 * into several chunk_seq when `latency: "balanced"`.
 *
 * Verified live on 2026-09-05 with the cloned voice and s2.1-pro-free:
 * 1 503 chars -> 6 chunks, 257/257 words aligned, last word ends 0.3 s before
 * the audio does. Concurrency limit is announced in the
 * `ratelimit-limit-concurrency` header (5 on the starter tier).
 */
import { loadEnv, optionalEnv, requireEnv } from "./env.ts";
import { log } from "./log.ts";
import { pcmDurationSec } from "./wav.ts";

export const FISH_TTS_TIMESTAMP_URL = "https://api.fish.audio/v1/tts/stream/with-timestamp";

export interface FishWord {
  text: string;
  /** seconds, global to the returned audio */
  start: number;
  end: number;
}

export interface FishConfig {
  apiKey: string;
  voiceId: string;
  model: string;
  temperature: number;
  topP: number;
}

export interface FishSynthesis {
  /** raw s16le mono 44.1 kHz */
  pcm: Buffer;
  words: FishWord[];
  durationSec: number;
  utf8Bytes: number;
  chunkCount: number;
  requestMs: number;
}

/**
 * One cloned voice per language: a clone trained on French takes reads English
 * with a heavy French accent (heard on the 04-odeon dry run), so EN uses its
 * own clone. FISH_AUDIO_VOICE_ID_<LANG> wins, FISH_AUDIO_VOICE_ID is the fallback.
 */
export function fishConfigFromEnv(lang?: string): FishConfig {
  loadEnv();
  const perLang = lang ? process.env[`FISH_AUDIO_VOICE_ID_${lang.toUpperCase()}`] : undefined;
  return {
    apiKey: requireEnv("FISH_AUDIO_API_KEY"),
    voiceId: perLang || requireEnv("FISH_AUDIO_VOICE_ID"),
    model: optionalEnv("FISH_AUDIO_MODEL", "s2.1-pro"),
    // Tighter sampling than the 0.7 default: measured on ai-audio-guide to cut
    // hallucinated words / language switches from 5 to 1 per 3 takes.
    temperature: Number(optionalEnv("FISH_AUDIO_TEMPERATURE", "0.3")),
    topP: Number(optionalEnv("FISH_AUDIO_TOP_P", "0.7")),
  };
}

// SSE parsing (pure, unit-tested)

interface SseEvent {
  audio_base64: string;
  content?: string;
  chunk_seq: number;
  chunk_audio_offset_sec: number;
  alignment: { audio_duration: number; segments: { text: string; start: number; end: number }[] } | null;
}

export interface ParsedStream {
  audio: Buffer;
  words: FishWord[];
  chunkCount: number;
  /** sum of per-chunk audio_duration reported by the alignment snapshots */
  alignedDurationSec: number;
}

export function parseTimestampSse(raw: string): ParsedStream {
  const audioParts: Buffer[] = [];
  const snapshots = new Map<number, { offset: number; alignment: NonNullable<SseEvent["alignment"]> }>();
  const seen = new Set<number>();

  for (const block of raw.split(/\r?\n\r?\n/)) {
    for (const line of block.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      const ev = JSON.parse(payload) as SseEvent;
      if (ev.audio_base64) audioParts.push(Buffer.from(ev.audio_base64, "base64"));
      seen.add(ev.chunk_seq);
      if (ev.alignment) {
        // "replace the previous alignment for the same chunk_seq; do not append"
        snapshots.set(ev.chunk_seq, { offset: ev.chunk_audio_offset_sec, alignment: ev.alignment });
      }
    }
  }

  const words: FishWord[] = [];
  let alignedDurationSec = 0;
  for (const seq of [...snapshots.keys()].sort((a, b) => a - b)) {
    const { offset, alignment } = snapshots.get(seq)!;
    alignedDurationSec += alignment.audio_duration;
    for (const s of alignment.segments) {
      words.push({ text: s.text, start: round3(s.start + offset), end: round3(s.end + offset) });
    }
  }
  return { audio: Buffer.concat(audioParts), words, chunkCount: seen.size, alignedDurationSec };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

// Alignment sanity guard

export interface AlignmentCheck {
  ok: boolean;
  textWords: number;
  alignedWords: number;
  textLetters: number;
  alignedLetters: number;
  reason?: string;
}

/** Letters+digits only, lower-cased: robust to Fish splitting "left-hand" into two tokens. */
export function letterStream(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

/**
 * Fish occasionally drops or invents a word. A 5 % word-count drift or a 3 %
 * letter drift means the take is unusable for subtitles: regenerate it.
 */
export function checkAlignment(text: string, words: FishWord[]): AlignmentCheck {
  const textWords = countWords(text);
  const alignedWords = words.length;
  const textLetters = letterStream(text).length;
  const alignedLetters = letterStream(words.map((w) => w.text).join("")).length;
  const res: AlignmentCheck = { ok: true, textWords, alignedWords, textLetters, alignedLetters };
  if (alignedWords === 0) return { ...res, ok: false, reason: "no words aligned" };
  const wordDrift = Math.abs(alignedWords - textWords) / textWords;
  const letterDrift = Math.abs(alignedLetters - textLetters) / textLetters;
  if (wordDrift > 0.05 && Math.abs(alignedWords - textWords) > 2) {
    return { ...res, ok: false, reason: `word count drift ${(wordDrift * 100).toFixed(1)}% (${alignedWords} vs ${textWords})` };
  }
  if (letterDrift > 0.03) {
    return { ...res, ok: false, reason: `letter drift ${(letterDrift * 100).toFixed(1)}% (${alignedLetters} vs ${textLetters})` };
  }
  return res;
}

// HTTP call with retries

const MAX_ATTEMPTS = 4;
const BACKOFF_MS = 2000;

export async function synthesizeWithTimestamps(
  text: string,
  cfg: FishConfig,
  opts: { scope?: string; fetchImpl?: typeof fetch } = {},
): Promise<FishSynthesis> {
  const scope = opts.scope ?? "fish";
  const fetchImpl = opts.fetchImpl ?? fetch;
  const utf8Bytes = Buffer.byteLength(text, "utf8");
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetchImpl(FISH_TTS_TIMESTAMP_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
          model: cfg.model,
        },
        body: JSON.stringify({
          text,
          reference_id: cfg.voiceId,
          format: "pcm", // raw s16le mono 44.1 kHz, byte-exact; Fish's wav header lies about sizes
          latency: "balanced", // lets the server split long input into aligned chunks
          temperature: cfg.temperature,
          top_p: cfg.topP,
          normalize: true,
        }),
      });

      if (!res.ok) {
        const body = (await res.text()).slice(0, 300);
        const retriable = res.status === 429 || res.status >= 500;
        const err = new Error(`Fish Audio HTTP ${res.status}: ${body}`);
        if (!retriable) throw Object.assign(err, { fatal: true });
        throw err;
      }
      const limit = res.headers.get("ratelimit-limit-concurrency");
      const current = res.headers.get("ratelimit-current-concurrency");
      const raw = await res.text();
      const parsed = parseTimestampSse(raw);
      if (parsed.audio.length === 0) throw new Error("empty audio stream");

      const check = checkAlignment(text, parsed.words);
      if (!check.ok) throw new Error(`alignment guard: ${check.reason}`);

      const durationSec = pcmDurationSec(parsed.audio);
      const requestMs = Date.now() - t0;
      log.info(
        scope,
        `${utf8Bytes} B -> ${durationSec.toFixed(1)} s audio, ${parsed.words.length} words, ${parsed.chunkCount} chunk(s), ${(requestMs / 1000).toFixed(1)} s` +
          (limit ? ` [concurrency ${current ?? "?"}/${limit}]` : ""),
      );
      return { pcm: parsed.audio, words: parsed.words, durationSec, utf8Bytes, chunkCount: parsed.chunkCount, requestMs };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if ((lastError as { fatal?: boolean }).fatal) throw lastError;
      log.warn(scope, `attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError.message}`);
      if (attempt < MAX_ATTEMPTS) {
        const delay = BACKOFF_MS * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`Fish Audio: all ${MAX_ATTEMPTS} attempts failed: ${lastError?.message}`);
}
