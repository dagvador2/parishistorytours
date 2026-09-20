/**
 * Human-recorded narration: Clément's own voice instead of the cloned TTS.
 *
 * A section is "recorded" as soon as an audio file sits at
 * `scripts/audio-source/<product>/recordings/<lang>/<section-id>.<ext>`. Word
 * timestamps — which the subtitles and the photo cues are derived from — come
 * from `tools/transcribe-recording.ts` (Whisper) and are stored next to it as
 * `<section-id>.words.json`, so the transcription runs once and re-running the
 * generator is free.
 *
 * The generator then treats the recording as a single pre-synthesised chunk:
 * everything downstream (sentence alignment, subtitles, photo cues, manifest)
 * is the same code as the TTS path.
 */
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FishWord } from "./fish.ts";
import { PATHS, type Lang, type SectionDef } from "./sections.ts";
import { PCM_BITS, PCM_CHANNELS, PCM_SAMPLE_RATE } from "./wav.ts";

const run = promisify(execFile);

/** Accepted container extensions, in priority order. */
export const RECORDING_EXTS = ["wav", "m4a", "mp3", "aiff", "flac"] as const;

export interface RecordingWords {
  /** file name of the audio the words were computed from */
  source: string;
  /** sha256 (first 12 hex) of that audio file: detects a re-recording */
  audioSha: string;
  model: string;
  transcribedAt: string;
  durationSec: number;
  /** what Whisper heard, verbatim — used only to diff against the script */
  transcript: string;
  words: FishWord[];
}

export function recordingsDir(lang: Lang): string {
  return resolve(PATHS.sourceDir, "recordings", lang);
}

/** Path of the recording for this section, or undefined when there is none. */
export function recordingPath(section: SectionDef, lang: Lang): string | undefined {
  for (const ext of RECORDING_EXTS) {
    const file = resolve(recordingsDir(lang), `${section.id}.${ext}`);
    if (existsSync(file)) return file;
  }
  return undefined;
}

export function recordingWordsPath(section: SectionDef, lang: Lang): string {
  return resolve(recordingsDir(lang), `${section.id}.words.json`);
}

export function fileSha(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 12);
}

/**
 * Word timestamps for a recording. Throws with the command to run when they
 * are missing, and when they were computed from a different take.
 */
export function loadRecordingWords(section: SectionDef, lang: Lang, audioFile: string): RecordingWords {
  const file = recordingWordsPath(section, lang);
  const hint = `pnpm tsx scripts/self-guided/tools/transcribe-recording.ts --lang ${lang} --section ${section.id}`;
  if (!existsSync(file)) throw new Error(`${section.id} (${lang}): recording found but no word timestamps — run: ${hint}`);
  const w = JSON.parse(readFileSync(file, "utf8")) as RecordingWords;
  const sha = fileSha(audioFile);
  if (w.audioSha !== sha) {
    throw new Error(`${section.id} (${lang}): ${file} was transcribed from a different take (${w.audioSha} != ${sha}) — re-run: ${hint}`);
  }
  if (!w.words?.length) throw new Error(`${section.id} (${lang}): ${file} holds no words`);
  return w;
}

/** Breathing room kept in front of the first word after a head trim. */
export const RECORDING_LEAD_SEC = 0.1;
/** Length of the fade applied over that lead, to kill a click or a room hiss. */
const FADE_IN_SEC = 0.08;

const bytesPerSample = () => (PCM_BITS / 8) * PCM_CHANNELS;

/** RMS of one window of samples, 0…1. */
function windowRms(pcm: Buffer, from: number, count: number): number {
  const bps = bytesPerSample();
  let sum = 0;
  let n = 0;
  for (let i = 0; i < count; i++) {
    const at = (from + i) * bps;
    if (at + 1 >= pcm.length) break;
    const v = pcm.readInt16LE(at) / 32768;
    sum += v * v;
    n++;
  }
  return n ? Math.sqrt(sum / n) : 0;
}

/**
 * Where the voice actually starts, in seconds.
 *
 * Whisper's first word timestamp is close but lands slightly early, and the
 * take often carries an isolated click — a mouth noise, the record button —
 * in the half second before speech. Trimming to the word timestamp therefore
 * kept the click, which loudness normalisation then lifted to nearly the level
 * of the voice.
 *
 * So the onset is read from the signal instead: the first window loud enough
 * *and held* long enough to be a voice. A click is a few milliseconds and
 * cannot satisfy the second condition.
 */
export function speechOnsetSec(pcm: Buffer, searchUntilSec: number): number | undefined {
  const bps = bytesPerSample();
  const win = Math.round(0.02 * PCM_SAMPLE_RATE);         // 20 ms
  const sustain = Math.round(0.16 * PCM_SAMPLE_RATE / win); // 160 ms of it
  const total = Math.floor(pcm.length / bps);
  const limit = Math.min(total, Math.floor(searchUntilSec * PCM_SAMPLE_RATE));
  if (limit < win * (sustain + 1)) return undefined;

  const rms: number[] = [];
  for (let i = 0; i + win <= limit; i += win) rms.push(windowRms(pcm, i, win));
  if (!rms.length) return undefined;

  // Noise floor from the quietest fifth of the search region; speech level
  // from the take as a whole, so a long silent head cannot skew it.
  const sorted = [...rms].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.2)] ?? 0;
  const speech = windowRms(pcm, 0, total);
  const threshold = Math.max(floor * 6, speech * 0.1, 1e-4);

  for (let i = 0; i + sustain < rms.length; i++) {
    let held = true;
    for (let j = 0; j < sustain; j++) if ((rms[i + j] ?? 0) < threshold) { held = false; break; }
    if (held) return (i * win) / PCM_SAMPLE_RATE;
  }
  return undefined;
}

/**
 * Drop the dead air a take starts with — the seconds between hitting record
 * and speaking, plus any click sitting in them. The word timestamps move with
 * the audio, so subtitles and photo cues stay where they were relative to the
 * voice; only the section gets shorter.
 *
 * Returns the take untouched when there is less than a lead's worth to cut.
 */
export function trimRecordingHead(pcm: Buffer, words: FishWord[]): { pcm: Buffer; words: FishWord[]; trimmedSec: number } {
  const first = words[0];
  if (!first) return { pcm, words, trimmedSec: 0 };

  // Look a little past the transcribed start: Whisper lands early, never late.
  const onset = speechOnsetSec(pcm, first.start + 1.0);
  const startsAt = onset ?? first.start;
  const cut = startsAt - RECORDING_LEAD_SEC;
  if (cut <= 0.05) return { pcm, words, trimmedSec: 0 };

  const bps = bytesPerSample();
  const offset = Math.floor(cut * PCM_SAMPLE_RATE) * bps;
  const out = Buffer.from(pcm.subarray(offset));

  // Ramp the kept lead in, so the cut itself is never audible.
  const fadeSamples = Math.min(Math.floor(FADE_IN_SEC * PCM_SAMPLE_RATE), Math.floor(out.length / bps));
  for (let i = 0; i < fadeSamples; i++) {
    const at = i * bps;
    out.writeInt16LE(Math.round(out.readInt16LE(at) * (i / fadeSamples)), at);
  }

  return {
    pcm: out,
    // The onset can sit past the transcribed start, which would push the first
    // word to a negative time; the audio is the truth, so clamp instead.
    words: words.map((w) => ({ ...w, start: Math.max(0, w.start - cut), end: Math.max(0, w.end - cut) })),
    trimmedSec: cut,
  };
}

/** Decode any container to the raw PCM the pipeline works in (s16le 44.1 kHz mono). */
export async function decodeToPcm(file: string): Promise<Buffer> {
  const { stdout } = await run(
    "ffmpeg",
    ["-v", "error", "-i", file, "-f", "s16le", "-acodec", "pcm_s16le", "-ac", String(PCM_CHANNELS), "-ar", String(PCM_SAMPLE_RATE), "-"],
    { encoding: "buffer", maxBuffer: 1024 * 1024 * 512 },
  );
  if (!stdout.length) throw new Error(`ffmpeg produced no audio for ${file}`);
  return stdout;
}
