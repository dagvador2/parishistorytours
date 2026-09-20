/**
 * Word timestamps for a human-recorded section, and a diff against the script.
 *
 *   pnpm tsx scripts/self-guided/tools/transcribe-recording.ts --lang fr [--section 01-intro] [--model large-v3]
 *
 * Runs Whisper on the take (word timestamps on), writes
 * `recordings/<lang>/<id>.words.json` next to the audio, then prints what
 * Whisper heard against what the script says, word by word. The script is the
 * text the subtitles are built from, so it has to be edited to match the take
 * — this diff is the list of edits to make. Numbers are ignored in the diff:
 * the script spells them out for the display layer, Whisper writes digits.
 *
 * Needs `whisper` on PATH (pipx install openai-whisper). `--from-json <dir>`
 * reuses `<dir>/<section-id>.json` from an earlier whisper run instead of
 * transcribing again.
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { parseArgs } from "../lib/args.ts";
import { letterStream, type FishWord } from "../lib/fish.ts";
import { log } from "../lib/log.ts";
import { toDisplayText } from "../lib/numbers.ts";
import { fileSha, recordingPath, recordingWordsPath, type RecordingWords } from "../lib/recordings.ts";
import { PATHS, SECTIONS, parseLangs, scriptPath, sectionById, type Lang, type SectionDef } from "../lib/sections.ts";
import { splitParagraphs } from "../lib/text.ts";

const run = promisify(execFile);

interface WhisperJson {
  text: string;
  segments: { words?: { word: string; start: number; end: number }[] }[];
}

async function transcribe(audio: string, model: string, scope: string): Promise<WhisperJson> {
  const tmp = resolve(PATHS.outputDir, "cache", "whisper");
  mkdirSync(tmp, { recursive: true });
  // 16 kHz mono is what Whisper resamples to anyway; doing it here keeps the
  // decode out of the model's timing loop and works for any container.
  const wav = resolve(tmp, "input.wav");
  await run("ffmpeg", ["-y", "-v", "error", "-i", audio, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
  log.info(scope, `whisper ${model}…`);
  // condition_on_previous_text off: with it on, Whisper fell into repetition
  // loops on both of the first two takes ("de la rive gauche et" nine times
  // over two seconds of audio, and a phantom clause), which silently wrecks
  // the alignment. Off, both came back clean.
  await run("whisper", [wav, "--model", model, "--language", "fr", "--word_timestamps", "True",
    "--condition_on_previous_text", "False",
    "--output_format", "json", "--output_dir", tmp, "--fp16", "False", "--verbose", "False"], { maxBuffer: 1024 * 1024 * 64 });
  const out = resolve(tmp, "input.json");
  const json = JSON.parse(readFileSync(out, "utf8")) as WhisperJson;
  rmSync(wav, { force: true });
  rmSync(out, { force: true });
  return json;
}

/**
 * Repetition loops: Whisper sometimes emits the same phrase over and over on a
 * short stretch of audio. Those words carry timestamps, so they quietly pull
 * the alignment off. Report any 5-gram that repeats.
 */
function loops(words: FishWord[]): { phrase: string; times: number; at: number }[] {
  const t = words.map((w) => w.text.trim().toLowerCase());
  const seen = new Map<string, number[]>();
  for (let i = 0; i + 5 <= t.length; i++) {
    const g = t.slice(i, i + 5).join(" ");
    seen.set(g, [...(seen.get(g) ?? []), i]);
  }
  return [...seen.entries()]
    .filter(([, at]) => at.length >= 3 && at[at.length - 1]! - at[0]! < at.length * 8)
    .map(([phrase, at]) => ({ phrase, times: at.length, at: words[at[0]!]!.start }))
    .sort((a, b) => b.times - a.times)
    .slice(0, 3);
}

/** Whisper words -> the pipeline's shape, with the surrounding spaces dropped. */
function toFishWords(j: WhisperJson): FishWord[] {
  const words: FishWord[] = [];
  for (const seg of j.segments) for (const w of seg.words ?? []) {
    const text = w.word.trim();
    if (text) words.push({ text, start: Math.round(w.start * 100) / 100, end: Math.round(w.end * 100) / 100 });
  }
  return words;
}

/** Comparable token stream: lower-case letters only, numbers normalised to digits. */
function tokens(text: string, lang: Lang): string[] {
  return toDisplayText(text, lang).text
    .split(/\s+/)
    .map((t) => letterStream(t))
    .filter(Boolean);
}

/** Classic LCS diff, printed as the edits to apply to the script. */
function diff(script: string[], heard: string[]): { kind: "=" | "-" | "+"; word: string }[] {
  const n = script.length, m = heard.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i]![j] = script[i] === heard[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const out: { kind: "=" | "-" | "+"; word: string }[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (script[i] === heard[j]) { out.push({ kind: "=", word: script[i]! }); i++; j++; }
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) { out.push({ kind: "-", word: script[i]! }); i++; }
    else { out.push({ kind: "+", word: heard[j]! }); j++; }
  }
  while (i < n) out.push({ kind: "-", word: script[i++]! });
  while (j < m) out.push({ kind: "+", word: heard[j++]! });
  return out;
}

/** Group the diff into runs of changes with a few words of context each side. */
function report(script: string[], heard: string[], scope: string): number {
  const d = diff(script, heard);
  const runs: { at: number; removed: string[]; added: string[]; before: string[]; after: string[] }[] = [];
  let resegmented = 0;
  let k = 0;
  while (k < d.length) {
    if (d[k]!.kind === "=") { k++; continue; }
    const start = k;
    const removed: string[] = [], added: string[] = [];
    while (k < d.length && d[k]!.kind !== "=") {
      (d[k]!.kind === "-" ? removed : added).push(d[k]!.word);
      k++;
    }
    const before = d.slice(Math.max(0, start - 6), start).filter((x) => x.kind === "=").map((x) => x.word);
    const after = d.slice(k, k + 6).filter((x) => x.kind === "=").map((x) => x.word);
    // Same letters on both sides = Whisper split or joined a compound
    // ("Saint-Michel" / "saint michel"). Nothing was said differently.
    if (removed.join("") === added.join("")) { resegmented++; continue; }
    runs.push({ at: start, removed, added, before, after });
  }
  const noise = resegmented ? ` (${resegmented} écart(s) de segmentation ignoré(s))` : "";
  if (runs.length === 0) { log.info(scope, `le script correspond à l'enregistrement${noise}`); return 0; }
  log.step(`${scope}: ${runs.length} écart(s) entre le script et ce qui a été dit${noise}`);
  for (const r of runs) {
    console.log(`  …${r.before.join(" ")} ⟨${r.removed.length ? `script: ${r.removed.join(" ")}` : "script: —"} | ${r.added.length ? `dit: ${r.added.join(" ")}` : "dit: —"}⟩ ${r.after.join(" ")}…`);
  }
  return runs.length;
}

async function one(section: SectionDef, lang: Lang, model: string, fromJson?: string): Promise<boolean> {
  const scope = `${lang}/${section.id}`;
  const audio = recordingPath(section, lang);
  if (!audio) return false;
  const reuse = fromJson ? resolve(fromJson, `${section.id}.json`) : undefined;
  let j: WhisperJson;
  if (reuse && existsSync(reuse)) {
    j = JSON.parse(readFileSync(reuse, "utf8")) as WhisperJson;
    log.info(scope, `transcription réutilisée: ${reuse}`);
  } else {
    j = await transcribe(audio, model, scope);
  }
  const words = toFishWords(j);
  if (!words.length) throw new Error(`${scope}: whisper returned no word timestamps`);
  for (const l of loops(words)) {
    log.warn(scope, `boucle probable à ${Math.floor(l.at / 60)}:${String(Math.floor(l.at % 60)).padStart(2, "0")} — « ${l.phrase} » x${l.times}. Vérifiez le passage : l'alignement en dépend.`);
  }
  const payload: RecordingWords = {
    source: audio.split("/").pop()!,
    audioSha: fileSha(audio),
    model,
    transcribedAt: new Date().toISOString(),
    durationSec: Math.round(words.at(-1)!.end * 100) / 100,
    transcript: j.text.trim(),
    words,
  };
  writeFileSync(recordingWordsPath(section, lang), JSON.stringify(payload, null, 1) + "\n");
  log.info(scope, `${words.length} mots horodatés, ${payload.durationSec.toFixed(1)} s -> ${recordingWordsPath(section, lang).replace(PATHS.root + "/", "")}`);
  const script = splitParagraphs(readFileSync(scriptPath(section, lang), "utf8")).join(" ");
  report(tokens(script, lang), tokens(payload.transcript, lang), scope);
  return true;
}

const args = parseArgs();
const model = args.get("model") ?? "large-v3";
const sections = args.get("section") ? [sectionById(args.get("section")!)] : SECTIONS;
let done = 0;
for (const lang of parseLangs(args.get("lang"))) {
  for (const section of sections) if (await one(section, lang, model, args.get("from-json"))) done++;
}
if (!done) log.warn("transcribe", "aucun enregistrement trouvé — déposez le fichier dans scripts/audio-source/left-bank-ww2/recordings/<lang>/<section-id>.m4a");
