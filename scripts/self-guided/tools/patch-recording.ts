/**
 * Splice a re-recorded sentence into a take, without re-recording the section.
 *
 *   pnpm tsx scripts/self-guided/tools/patch-recording.ts --lang fr \
 *     --section 03-fall-of-paris --patch "~/Desktop/03 - Erreur réparée.m4a" [--dry-run]
 *
 * Clément listens to a section, hears himself say "mars 1944" where the script
 * says 1940, and records the sentence again on his phone. This puts that
 * sentence where the botched one was.
 *
 * How the place is found: the patch is transcribed, and its word stream is
 * matched against the take's. The first and last few words of the patch anchor
 * the span; the best-scoring candidate span wins. Nothing is typed by hand, so
 * a patch that does not actually belong to this section is rejected rather
 * than dropped in the wrong place.
 *
 * How the join is made: the cuts fall in the *middle of the silences* either
 * side of the replaced sentence, and the patch brings its own room tone to
 * fill the other half — a digital-silence join between two stretches of room
 * tone reads as a dropout. The patch is level-matched to its neighbours (the
 * loudness pass later works on the whole section, so it would not catch a
 * step in the middle) and both joins get a 20 ms cross-fade.
 *
 * Word timestamps are spliced too, not re-transcribed: the arithmetic is exact
 * because this is what moved the audio, and a full Whisper pass over six
 * minutes costs twenty. `--retranscribe` is there for when a take has been
 * edited by some other means.
 *
 * The raw take is never overwritten. It moves to `originals/` on the first
 * patch, every patch audio is kept in `patches/`, and the take is REBUILT from
 * the original each time — so patches never stack generations of AAC, and
 * re-running the tool is idempotent.
 */
import { execFile } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { promisify } from "node:util";
import { parseArgs } from "../lib/args.ts";
import { letterStream, type FishWord } from "../lib/fish.ts";
import { fmtBytes, log } from "../lib/log.ts";
import {
  decodeToPcm, fileSha, recordingPath, recordingWordsPath, recordingsDir, type RecordingWords,
} from "../lib/recordings.ts";
import { PATHS, parseLangs, sectionById, type Lang, type SectionDef } from "../lib/sections.ts";
import { PCM_BITS, PCM_CHANNELS, PCM_SAMPLE_RATE, pcmDurationSec, pcmToWav } from "../lib/wav.ts";

const run = promisify(execFile);
const BPS = (PCM_BITS / 8) * PCM_CHANNELS;

/** Cross-fade at each join: long enough to hide a step, short enough to hide itself. */
const FADE_SEC = 0.02;
/** Room tone kept around the patch when the take's own pause is shorter than this. */
const MIN_PAUSE_SEC = 0.12;
/** How far the patch may be lifted or lowered to sit with its neighbours. */
const MAX_GAIN_DB = 8;
/** Seconds of the take either side of the splice used as the level reference. */
const LEVEL_WINDOW_SEC = 25;

// ------------------------------------------------------------------- record

interface PatchEntry {
  /** file name under patches/ */
  file: string;
  /** sha of the patch audio, so the same take is rebuilt every time */
  sha: string;
  /** what it replaces, as word indexes into the ORIGINAL take's word stream */
  fromWord: number;
  toWord: number;
  /** what the original said there, and what the patch says instead */
  was: string;
  now: string;
  addedAt: string;
}

const dirs = (lang: Lang) => ({
  originals: resolve(recordingsDir(lang), "originals"),
  patches: resolve(recordingsDir(lang), "patches"),
});
const patchLogPath = (section: SectionDef, lang: Lang) => resolve(dirs(lang).patches, `${section.id}.json`);
const patchWordsPath = (section: SectionDef, lang: Lang, file: string) =>
  resolve(dirs(lang).patches, `${file.slice(0, -extname(file).length)}.words.json`);

function loadPatchLog(section: SectionDef, lang: Lang): PatchEntry[] {
  const p = patchLogPath(section, lang);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as PatchEntry[]) : [];
}

// ---------------------------------------------------------------- matching

const tok = (s: string) => letterStream(s);
const tokens = (words: FishWord[]) => words.map((w) => tok(w.text)).map((t) => t);

/** Length of the longest common subsequence of two token lists. */
function lcs(a: string[], b: string[]): number {
  const prev = new Uint32Array(b.length + 1);
  const cur = new Uint32Array(b.length + 1);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      cur[j] = a[i] === b[j] ? prev[j + 1]! + 1 : Math.max(prev[j]!, cur[j + 1]!);
    }
    prev.set(cur);
    cur.fill(0);
  }
  return prev[0]!;
}

/** Does `hay` carry `needle` starting at `at`? */
const runAt = (hay: string[], at: number, needle: string[]) =>
  needle.every((t, k) => hay[at + k] === t);

/**
 * The span of `take` that `patch` is a new reading of.
 *
 * Anchored on the patch's opening and closing runs, then scored on the whole
 * span so a repeated opening ("Mais au cours de…") cannot win on its own.
 */
export function locateSpan(take: FishWord[], patch: FishWord[]): { from: number; to: number; score: number } {
  const T = tokens(take);
  const P = tokens(patch);
  const k = Math.min(4, Math.max(1, Math.floor(P.length / 3)));
  const head = P.slice(0, k);
  const tail = P.slice(-k);

  const starts: number[] = [];
  for (let i = 0; i + head.length <= T.length; i++) if (runAt(T, i, head)) starts.push(i);
  const ends: number[] = [];
  for (let i = 0; i + tail.length <= T.length; i++) if (runAt(T, i, tail)) ends.push(i + tail.length - 1);
  if (!starts.length || !ends.length) {
    throw new Error(
      `the patch does not open and close on anything in this take — first words "${patch.slice(0, k).map((w) => w.text).join(" ")}", ` +
      `last words "${patch.slice(-k).map((w) => w.text).join(" ")}". Wrong section, or a re-recording that changes the wording too much to place by itself.`,
    );
  }

  let best: { from: number; to: number; score: number } | undefined;
  for (const from of starts) {
    for (const to of ends) {
      if (to < from) continue;
      // A span wildly longer than the patch is not a new reading of it.
      if (to - from + 1 > P.length * 2 + 8) continue;
      const span = T.slice(from, to + 1);
      const score = lcs(span, P) / Math.max(span.length, P.length);
      if (!best || score > best.score) best = { from, to, score };
    }
  }
  if (!best) throw new Error("the patch opens after it closes in this take — nothing to replace");
  return best;
}

// -------------------------------------------------------------------- audio

/** Speech level of a region: the 90th percentile of 50 ms RMS, so pauses do not drag it down. */
function speechLevel(pcm: Buffer, fromSec: number, toSec: number): number {
  const win = Math.round(0.05 * PCM_SAMPLE_RATE);
  const from = Math.max(0, Math.floor(fromSec * PCM_SAMPLE_RATE));
  const to = Math.min(Math.floor(pcm.length / BPS), Math.ceil(toSec * PCM_SAMPLE_RATE));
  const rms: number[] = [];
  for (let i = from; i + win <= to; i += win) {
    let sum = 0;
    for (let k = 0; k < win; k++) {
      const v = pcm.readInt16LE((i + k) * BPS) / 32768;
      sum += v * v;
    }
    rms.push(Math.sqrt(sum / win));
  }
  if (!rms.length) return 0;
  rms.sort((a, b) => a - b);
  return rms[Math.min(rms.length - 1, Math.floor(rms.length * 0.9))]!;
}

const slice = (pcm: Buffer, fromSec: number, toSec: number) =>
  pcm.subarray(
    Math.max(0, Math.floor(fromSec * PCM_SAMPLE_RATE) * BPS),
    Math.min(pcm.length, Math.floor(toSec * PCM_SAMPLE_RATE) * BPS),
  );

function withGain(pcm: Buffer, gain: number): Buffer {
  if (Math.abs(gain - 1) < 0.01) return pcm;
  const out = Buffer.from(pcm);
  for (let at = 0; at + 1 < out.length; at += BPS) {
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(out.readInt16LE(at) * gain))), at);
  }
  return out;
}

/** Join two pieces with an equal-power cross-fade over the tail of `a` / head of `b`. */
function crossfade(a: Buffer, b: Buffer): Buffer {
  const n = Math.min(Math.round(FADE_SEC * PCM_SAMPLE_RATE), Math.floor(a.length / BPS), Math.floor(b.length / BPS));
  if (n <= 0) return Buffer.concat([a, b]);
  const head = Buffer.from(a.subarray(0, a.length - n * BPS));
  const mixed = Buffer.alloc(n * BPS);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const va = a.readInt16LE(a.length - (n - i) * BPS) * Math.cos((t * Math.PI) / 2);
    const vb = b.readInt16LE(i * BPS) * Math.sin((t * Math.PI) / 2);
    mixed.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(va + vb))), i * BPS);
  }
  return Buffer.concat([head, mixed, Buffer.from(b.subarray(n * BPS))]);
}

async function encodeM4a(pcm: Buffer, out: string): Promise<void> {
  const tmp = resolve(PATHS.outputDir, "cache", `patch-${process.pid}.wav`);
  mkdirSync(resolve(tmp, ".."), { recursive: true });
  writeFileSync(tmp, pcmToWav(pcm));
  // Mono 44.1 kHz is what the pipeline decodes to anyway; 192k AAC is
  // transparent for speech and the untouched take stays in originals/.
  await run("ffmpeg", ["-y", "-v", "error", "-i", tmp, "-c:a", "aac", "-b:a", "192k", "-ac", "1", "-ar", String(PCM_SAMPLE_RATE), out]);
  rmSync(tmp, { force: true });
}

// --------------------------------------------------------------- transcribe

interface WhisperJson { text: string; segments: { words?: { word: string; start: number; end: number }[] }[] }

async function whisperWords(audio: string, model: string, lang: Lang, scope: string): Promise<{ words: FishWord[]; text: string }> {
  const tmp = resolve(PATHS.outputDir, "cache", "whisper");
  mkdirSync(tmp, { recursive: true });
  const wav = resolve(tmp, "patch.wav");
  await run("ffmpeg", ["-y", "-v", "error", "-i", audio, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
  log.info(scope, `whisper ${model}…`);
  await run("whisper", [wav, "--model", model, "--language", lang, "--word_timestamps", "True",
    "--condition_on_previous_text", "False", "--output_format", "json", "--output_dir", tmp,
    "--fp16", "False", "--verbose", "False"], { maxBuffer: 1024 * 1024 * 64 });
  const j = JSON.parse(readFileSync(resolve(tmp, "patch.json"), "utf8")) as WhisperJson;
  rmSync(wav, { force: true });
  rmSync(resolve(tmp, "patch.json"), { force: true });
  const words: FishWord[] = [];
  for (const seg of j.segments) for (const w of seg.words ?? []) {
    const text = w.word.trim();
    if (text) words.push({ text, start: Math.round(w.start * 100) / 100, end: Math.round(w.end * 100) / 100 });
  }
  if (!words.length) throw new Error(`whisper returned no words for ${audio}`);
  return { words, text: j.text.trim() };
}

// -------------------------------------------------------------------- build

interface Applied { entry: PatchEntry; words: FishWord[] }

/** Rebuild the take from the original plus every recorded patch. */
async function rebuild(section: SectionDef, lang: Lang, original: string, originalWords: FishWord[], applied: Applied[], scope: string) {
  const takePcm = await decodeToPcm(original);
  const takeDur = pcmDurationSec(takePcm);
  const ordered = [...applied].sort((a, b) => a.entry.fromWord - b.entry.fromWord);

  const pieces: Buffer[] = [];
  const words: FishWord[] = [];
  let readAt = 0;        // where we are in the original, seconds
  let writeAt = 0;       // where that lands in the rebuilt take, seconds
  let wordAt = 0;        // next original word to copy

  for (const { entry, words: patchWords } of ordered) {
    const first = originalWords[entry.fromWord]!;
    const last = originalWords[entry.toWord]!;
    const before = originalWords[entry.fromWord - 1];
    const after = originalWords[entry.toWord + 1];
    // Cut in the middle of the silence on each side; the patch supplies the
    // other half from its own room tone.
    const cutStart = before ? (before.end + first.start) / 2 : Math.max(0, first.start - MIN_PAUSE_SEC);
    const cutEnd = after ? (last.end + after.start) / 2 : Math.min(takeDur, last.end + MIN_PAUSE_SEC);
    const lead = Math.max(MIN_PAUSE_SEC, first.start - cutStart);
    const trail = Math.max(MIN_PAUSE_SEC, cutEnd - last.end);

    const patchFile = resolve(dirs(lang).patches, entry.file);
    const patchPcm = await decodeToPcm(patchFile);
    const patchDur = pcmDurationSec(patchPcm);
    const pFirst = patchWords[0]!;
    const pLast = patchWords[patchWords.length - 1]!;
    const segFrom = Math.max(0, pFirst.start - lead);
    const segTo = Math.min(patchDur, pLast.end + trail);

    // Match the level of what surrounds the splice: the loudness pass later
    // works on the whole section and would leave a step in the middle.
    const ref = speechLevel(takePcm, Math.max(0, cutStart - LEVEL_WINDOW_SEC), cutStart)
      || speechLevel(takePcm, cutEnd, cutEnd + LEVEL_WINDOW_SEC);
    const own = speechLevel(patchPcm, pFirst.start, pLast.end);
    let gain = ref > 0 && own > 0 ? ref / own : 1;
    const db = 20 * Math.log10(gain);
    if (Math.abs(db) > MAX_GAIN_DB) gain = 10 ** ((Math.sign(db) * MAX_GAIN_DB) / 20);

    // copy the original up to the cut, then the patch
    pieces.push(slice(takePcm, readAt, cutStart));
    for (; wordAt <= entry.fromWord - 1; wordAt++) {
      const w = originalWords[wordAt]!;
      words.push({ ...w, start: w.start + writeAt - readAt, end: w.end + writeAt - readAt });
    }
    const shift = writeAt + (cutStart - readAt);          // where the cut lands in the rebuild
    const segment = withGain(slice(patchPcm, segFrom, segTo), gain);
    pieces.push(segment);
    // the patch's first word lands exactly where the replaced one started
    const patchShift = shift + (pFirst.start - segFrom) - pFirst.start;
    for (const w of patchWords) words.push({ ...w, start: round2(w.start + patchShift), end: round2(w.end + patchShift) });

    writeAt = shift + pcmDurationSec(segment);
    readAt = cutEnd;
    wordAt = entry.toWord + 1;
    log.info(scope, `« ${entry.was} »`);
    log.info(scope, `→ « ${entry.now} » — ${(cutEnd - cutStart).toFixed(2)} s remplacées par ${(segTo - segFrom).toFixed(2)} s, niveau ${db >= 0 ? "+" : ""}${db.toFixed(1)} dB`);
  }

  pieces.push(slice(takePcm, readAt, takeDur));
  for (; wordAt < originalWords.length; wordAt++) {
    const w = originalWords[wordAt]!;
    words.push({ ...w, start: round2(w.start + writeAt - readAt), end: round2(w.end + writeAt - readAt) });
  }

  // Cross-fade every join rather than butting the buffers together.
  const pcm = pieces.reduce((acc, p) => (acc.length ? crossfade(acc, p) : p));
  return { pcm, words, before: takeDur, after: pcmDurationSec(pcm) };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// --------------------------------------------------------------------- main

(async () => {
  const args = parseArgs();
  const lang = parseLangs(args.get("lang"))[0]!;
  const section = sectionById(args.get("section") ?? "");
  const model = args.get("model") ?? "large-v3";
  const dryRun = args.has("dry-run");
  const scope = `${lang}/${section.id}`;
  const { originals, patches } = dirs(lang);
  mkdirSync(originals, { recursive: true });
  mkdirSync(patches, { recursive: true });

  const take = recordingPath(section, lang);
  if (!take) throw new Error(`${scope}: no recording to patch`);
  const ext = extname(take);

  // First patch on this section: the raw take and its words move aside, for good.
  const originalAudio = resolve(originals, `${section.id}${ext}`);
  const originalWordsFile = resolve(originals, `${section.id}.words.json`);
  if (!existsSync(originalAudio)) {
    copyFileSync(take, originalAudio);
    copyFileSync(recordingWordsPath(section, lang), originalWordsFile);
    log.info(scope, `prise d'origine archivée: ${originalAudio.replace(PATHS.root + "/", "")}`);
  }
  const originalWords = (JSON.parse(readFileSync(originalWordsFile, "utf8")) as RecordingWords).words;

  const log_ = loadPatchLog(section, lang);

  const incoming = args.get("patch");
  if (incoming) {
    const src = incoming.replace(/^~/, process.env.HOME ?? "~");
    if (!existsSync(src)) throw new Error(`patch not found: ${src}`);
    const sha = fileSha(src);
    if (log_.some((p) => p.sha === sha)) {
      log.warn(scope, `ce patch est déjà appliqué (${sha}) — reconstruction seule`);
    } else {
      // A --dry-run leaves the copy and the transcription behind on purpose:
      // Whisper is the slow part, and the same file is usually passed again.
      const already = readdirSync(patches)
        .filter((f) => f.startsWith(`${section.id}.`) && f.endsWith(".words.json"))
        .map((f) => ({ f, j: JSON.parse(readFileSync(resolve(patches, f), "utf8")) as { sha?: string; words: FishWord[]; text: string } }))
        .find((x) => x.j.sha === sha);
      const file = already
        ? readdirSync(patches).find((f) => f.startsWith(already.f.replace(/\.words\.json$/, "")) && !f.endsWith(".json"))!
        : `${section.id}.${String(log_.length + 1).padStart(2, "0")}${extname(src)}`;
      if (!already) copyFileSync(src, resolve(patches, file));
      const { words, text } = already
        ? (log.info(scope, `transcription du patch réutilisée (${file})`), { words: already.j.words, text: already.j.text })
        : await whisperWords(resolve(patches, file), model, lang, scope);
      if (!already) writeFileSync(patchWordsPath(section, lang, file), JSON.stringify({ source: basename(src), sha, model, words, text }, null, 1) + "\n");
      const span = locateSpan(originalWords, words);
      const was = originalWords.slice(span.from, span.to + 1).map((w) => w.text).join(" ");
      if (span.score < 0.6) {
        throw new Error(
          `the patch matches nothing convincingly (best span ${(span.score * 100).toFixed(0)} %): "${was}". ` +
          `Check that it belongs to ${section.id}.`);
      }
      if (log_.some((p) => span.from <= p.toWord && p.fromWord <= span.to)) {
        throw new Error(`that span is already covered by an earlier patch — remove it from ${patchLogPath(section, lang)} first`);
      }
      log_.push({ file, sha, fromWord: span.from, toWord: span.to, was, now: text, addedAt: new Date().toISOString() });
      log.info(scope, `emplacement trouvé aux mots ${span.from}-${span.to} (${(span.score * 100).toFixed(0)} % de recouvrement)`);
    }
  }

  if (!log_.length) throw new Error(`${scope}: nothing to apply — pass --patch <file>`);

  const applied: Applied[] = log_.map((entry) => ({
    entry,
    words: (JSON.parse(readFileSync(patchWordsPath(section, lang, entry.file), "utf8")) as { words: FishWord[] }).words,
  }));

  const built = await rebuild(section, lang, originalAudio, originalWords, applied, scope);
  log.step(`${scope}: ${log_.length} patch(s), ${built.before.toFixed(2)} s -> ${built.after.toFixed(2)} s, ${built.words.length} mots`);
  if (dryRun) { log.info(scope, "DRY RUN — rien n'est écrit"); return; }

  writeFileSync(patchLogPath(section, lang), JSON.stringify(log_, null, 1) + "\n");
  const out = resolve(recordingsDir(lang), `${section.id}.m4a`);
  await encodeM4a(built.pcm, out);
  if (ext !== ".m4a" && existsSync(take)) renameSync(take, resolve(originals, `${section.id}.replaced${ext}`));

  const payload: RecordingWords = {
    source: basename(out),
    audioSha: fileSha(out),
    model: `patched:${model}`,
    transcribedAt: new Date().toISOString(),
    durationSec: round2(built.words.at(-1)!.end),
    transcript: "", // rebuilt from the pieces below
    words: built.words,
  };
  payload.transcript = built.words.map((w) => w.text).join(" ");
  writeFileSync(recordingWordsPath(section, lang), JSON.stringify(payload, null, 1) + "\n");
  log.info(scope, `prise reconstruite: ${out.replace(PATHS.root + "/", "")} (${fmtBytes(readFileSync(out).length)})`);
  log.info(scope, `horodatage des mots recalculé — pas de nouvelle transcription`);
  log.step(`régénérez: pnpm self-guided:generate --lang ${lang} --section ${section.id}`);
})();
