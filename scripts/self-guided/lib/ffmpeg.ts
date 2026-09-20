/** Thin ffmpeg / ffprobe wrappers (both must be on PATH; Homebrew ffmpeg 8 tested). */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

export async function assertFfmpeg(): Promise<void> {
  try {
    await execFileP("ffmpeg", ["-version"]);
    await execFileP("ffprobe", ["-version"]);
  } catch {
    throw new Error("ffmpeg/ffprobe not found on PATH (brew install ffmpeg)");
  }
}

export async function probeDurationSec(file: string): Promise<number> {
  const { stdout } = await execFileP("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  const d = Number(stdout.trim());
  if (!Number.isFinite(d)) throw new Error(`ffprobe: no duration for ${file}`);
  return d;
}

export interface LoudnormTarget {
  /** integrated loudness, LUFS */
  I: number;
  /** true peak, dBTP */
  TP: number;
  /** loudness range, LU */
  LRA: number;
}
export const SPEECH_LOUDNESS: LoudnormTarget = { I: -16, TP: -1.5, LRA: 11 };

/**
 * Two-pass EBU R128 normalisation (linear gain, no timing change) and MP3
 * encode. Mono 44.1 kHz 128 kbps: speech-only content, ~1 MB per minute.
 */
export async function normalizeToMp3(inputWav: string, outMp3: string, target = SPEECH_LOUDNESS, bitrate = "128k"): Promise<{ inputI: number; gainDb: number }> {
  const base = `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}`;
  // pass 1: measure
  const { stderr } = await execFileP("ffmpeg", ["-hide_banner", "-nostats", "-i", inputWav, "-af", `${base}:print_format=json`, "-f", "null", "-"]);
  const jsonStart = stderr.lastIndexOf("{");
  const jsonEnd = stderr.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error(`loudnorm pass 1: no measurement in ffmpeg output:\n${stderr.slice(-800)}`);
  const m = JSON.parse(stderr.slice(jsonStart, jsonEnd + 1)) as Record<string, string>;
  // pass 2: apply linear gain from the measurement
  const filter =
    `${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
    `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=summary`;
  await execFileP("ffmpeg", [
    "-hide_banner", "-nostats", "-y",
    "-i", inputWav,
    "-af", filter,
    "-ar", "44100", "-ac", "1",
    "-c:a", "libmp3lame", "-b:a", bitrate,
    "-id3v2_version", "3",
    outMp3,
  ]);
  return { inputI: Number(m.input_i), gainDb: target.I - Number(m.input_i) };
}

/** First `seconds` of an MP3 with a fade-out, re-encoded at the same settings. */
export async function excerptMp3(inputMp3: string, outMp3: string, seconds: number, fadeSec = 2): Promise<void> {
  await execFileP("ffmpeg", [
    "-hide_banner", "-nostats", "-y",
    "-i", inputMp3,
    "-t", String(seconds),
    "-af", `afade=t=out:st=${seconds - fadeSec}:d=${fadeSec}`,
    "-ar", "44100", "-ac", "1",
    "-c:a", "libmp3lame", "-b:a", "128k",
    outMp3,
  ]);
}

/** A window of an MP3, faded in and out so it neither clicks nor cuts a word dead. */
export async function sliceMp3(inputMp3: string, outMp3: string, startSec: number, endSec: number, fadeInSec = 0.4, fadeOutSec = 1.6): Promise<void> {
  const dur = endSec - startSec;
  await execFileP("ffmpeg", [
    "-hide_banner", "-nostats", "-y",
    "-ss", startSec.toFixed(3),
    "-i", inputMp3,
    "-t", dur.toFixed(3),
    "-af", `afade=t=in:st=0:d=${fadeInSec},afade=t=out:st=${(dur - fadeOutSec).toFixed(3)}:d=${fadeOutSec}`,
    "-ar", "44100", "-ac", "1",
    "-c:a", "libmp3lame", "-b:a", "128k",
    outMp3,
  ]);
}
