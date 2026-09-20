/**
 * Generate the narration audio + manifest for the self-guided tour.
 *
 *   pnpm self-guided:generate [--lang en|fr|both] [--section <id>] [--force] [--dry-run]
 *
 * Per section and language:
 *   1. script -> paragraphs -> TTS requests of <= 1500 chars (paragraph groups)
 *   2. each request goes to Fish Audio (word timestamps), cached by content hash
 *      in output/cache/ so a crash or a one-sentence fix never regenerates everything
 *   3. chunks are joined with a short silence, loudness-normalised (-16 LUFS,
 *      two-pass, linear) and encoded to MP3 in output/audio/<lang>/<id>.mp3
 *   4. sentences become subtitles { t, text } (text with numbers as digits),
 *      photo cues become { t, img, cap, w, h } from config/media-cues.<lang>.json
 *   5. output/manifest/<lang>.json is merged (only regenerated sections change)
 *
 * --dry-run prints the request plan (chunks, chars, cache hits, cost) without
 * calling Fish Audio or writing anything.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "./lib/args.ts";
import { firstLetterIndex, letterTimer, spokenTimer, timeOfPhrase, type ChunkTimer } from "./lib/align.ts";
import { loadMediaCues, resolveAnchor, type MediaCueCampaignBeat, type MediaCueRouteBeat } from "./lib/cues.ts";
import { assertFfmpeg, normalizeToMp3, probeDurationSec } from "./lib/ffmpeg.ts";
import { fishConfigFromEnv, synthesizeWithTimestamps, type FishConfig, type FishWord } from "./lib/fish.ts";
import { shortHash } from "./lib/hash.ts";
import { fmtBytes, fmtCost, fmtDuration, log } from "./lib/log.ts";
import { round2, writeManifest, type ManifestCampaign, type ManifestMedia, type ManifestRoute, type ManifestSection, type ManifestSub } from "./lib/manifest.ts";
import { toDisplayText } from "./lib/numbers.ts";
import { isClip, photoOutputDims } from "./lib/photos.ts";
import { decodeToPcm, fileSha, loadRecordingWords, recordingPath, recordingWordsPath, trimRecordingHead } from "./lib/recordings.ts";
import { matchRate, scriptWords } from "./lib/wordmap.ts";
import { PATHS, R2_KEYS, SECTIONS, parseLangs, scriptPath, sectionById, type Lang, type SectionDef } from "./lib/sections.ts";
import { groupParagraphs, splitLongSentence, splitParagraphs, splitSentences } from "./lib/text.ts";
import { pcmDurationSec, pcmSilence, pcmToWav, wavToPcm } from "./lib/wav.ts";

const MAX_CHUNK_CHARS = 1500;
/** silence inserted between two TTS requests (paragraph break) */
const GAP_SEC = 0.4;

interface CachedChunk {
  text: string;
  words: FishWord[];
  durationSec: number;
  utf8Bytes: number;
  model: string;
  voiceId: string;
  generatedAt: string;
}

interface Chunk {
  index: number;
  paragraphs: string[];
  /** paragraph indexes (within the section) covered by this chunk */
  paragraphIndexes: number[];
  text: string;
  hash: string;
  cachePath: string;
  cached: boolean;
}

function planChunks(section: SectionDef, lang: Lang, paragraphs: string[], cfg: FishConfig, recording?: string): Chunk[] {
  // A recording is one continuous take: it is never split, so the whole
  // section is a single chunk and no silence is inserted anywhere.
  const groups = recording ? [paragraphs] : groupParagraphs(paragraphs, MAX_CHUNK_CHARS);
  const dir = resolve(PATHS.cacheDir, lang, section.id);
  let pIdx = 0;
  return groups.map((group, index) => {
    const text = group.join("\n\n");
    // The word timestamps are part of the input, not just the audio: a
    // re-transcription must invalidate the chunk the same way a new take does.
    const hash = recording
      ? shortHash(text, "recording", fileSha(recording), fileSha(recordingWordsPath(section, lang)))
      : shortHash(text, cfg.voiceId, cfg.model, String(cfg.temperature), String(cfg.topP), "pcm");
    const cachePath = resolve(dir, `${hash}.json`);
    const paragraphIndexes = group.map((_, k) => pIdx + k);
    pIdx += group.length;
    return { index, paragraphs: group, paragraphIndexes, text, hash, cachePath, cached: existsSync(cachePath) && existsSync(cachePath.replace(/\.json$/, ".wav")) };
  });
}

/**
 * Hang the route map's beats on the narration: each point lights up at the
 * moment it is named, so the drawn walk and the spoken one stay together even
 * after a re-recording. Times are relative to the cue, which is where the
 * player's own clock starts.
 */
async function buildRoute(beats: MediaCueRouteBeat[], words: FishWord[], cueT: number, scope: string): Promise<ManifestRoute> {
  const meta = JSON.parse(readFileSync(resolve(PATHS.configDir, "route-map.json"), "utf8")) as {
    credit: string; proj: ManifestRoute["proj"];
  };
  // The cursor only moves on to a new phrase: several points can share one
  // sentence ("ensuite trois courts arrêts autour de la Sorbonne").
  let search = cueT;
  let lastFind = "";
  let lastAt = cueT;
  const out: ManifestRoute["beats"] = [];
  for (const b of beats) {
    if (b.find !== lastFind) {
      const found = timeOfPhrase(words, b.find, search);
      if (found === undefined) throw new Error(`${scope}: route beat phrase not found after ${search.toFixed(2)}s: "${b.find}"`);
      lastAt = found;
      search = found + 0.01;
      lastFind = b.find;
    }
    const at = round2(Math.max(0, lastAt + (b.offset ?? 0) - cueT));
    const dims = b.img ? await photoOutputDims(b.img) : undefined;
    out.push({ stop: b.stop, at, ...(b.img ? { img: R2_KEYS.photo(b.img), cap: b.cap, ...dims } : {}) });
  }
  out.sort((a, b) => a.at - b.at);
  log.info(scope, `route map: ${out.length} beats, ${out.map((b) => `${b.stop.slice(0, 2)}@${b.at}s`).join(" ")}`);
  return { proj: meta.proj, credit: meta.credit, beats: out };
}

/**
 * The same, for a campaign map — May 1940 (`offensive-map.json`) or 1944
 * (`strategic-map.json`): each arrow is drawn at the second it is spoken. The
 * four pre-rendered loops this replaces were hand-timed and cut into separate
 * files; here each map is one continuous drawing whose every move is read off
 * the narration.
 */
async function buildCampaign(
  beats: MediaCueCampaignBeat[], words: FishWord[], cueT: number, scope: string, map: "offensive" | "strategic",
): Promise<ManifestCampaign> {
  const meta = JSON.parse(readFileSync(resolve(PATHS.configDir, `${map}-map.json`), "utf8")) as {
    credit: string; proj: ManifestCampaign["proj"];
  };
  // As with the route map, the cursor only moves on to a new phrase: two moves
  // can share one sentence ("les Allemands attaquent en Belgique et aux Pays-Bas").
  let search = cueT;
  let lastFind = "";
  let lastAt = cueT;
  const out: ManifestCampaign["beats"] = [];
  for (const b of beats) {
    if (b.find !== lastFind) {
      const found = timeOfPhrase(words, b.find, search);
      if (found === undefined) throw new Error(`${scope}: ${map} beat phrase not found after ${search.toFixed(2)}s: "${b.find}"`);
      lastAt = found;
      search = found + 0.01;
      lastFind = b.find;
    }
    const at = round2(Math.max(0, lastAt + (b.offset ?? 0) - cueT));
    const dims = b.img ? await photoOutputDims(b.img) : undefined;
    out.push({ move: b.move, at, ...(b.img ? { img: R2_KEYS.photo(b.img), ...dims } : {}) });
  }
  out.sort((a, b) => a.at - b.at);
  log.info(scope, `${map} map: ${out.length} moves, ${out.map((b) => `${b.move}@${b.at}s`).join(" ")}`);
  return { proj: meta.proj, credit: meta.credit, beats: out };
}

/**
 * Decode a recording into the pipeline's PCM and reuse the word timestamps
 * produced by tools/transcribe-recording.ts. The alignment drift between the
 * script and what was actually said is reported, not enforced: a recorded take
 * is the source of truth and the script is edited to match it, but a large
 * drift means the subtitles will slide and is worth seeing.
 */
async function loadRecordedChunk(chunk: Chunk, section: SectionDef, lang: Lang, recording: string, scope: string): Promise<{ pcm: Buffer; meta: CachedChunk }> {
  const raw = loadRecordingWords(section, lang, recording);
  const decoded = await decodeToPcm(recording);
  const { pcm, words, trimmedSec } = trimRecordingHead(decoded, raw.words);
  if (trimmedSec) log.info(scope, `recording: trimmed ${trimmedSec.toFixed(2)} s of room noise before the first word`);
  const w = { ...raw, words };
  // How much of the script actually pairs with a spoken word. Letter drift is
  // the wrong measure here: the script spells numbers out and the transcript
  // writes digits, which is a 4 % letter difference and no divergence at all.
  const script = scriptWords(chunk.text);
  const rate = matchRate(script, w.words, lang);
  const msg = `recording: ${script.length} script words, ${w.words.length} spoken, ${(rate * 100).toFixed(1)} % matched`;
  if (rate < 0.9) log.warn(scope, `${msg} — the script and the take have diverged, edit the script to match what was said`);
  else log.info(scope, msg);
  const meta: CachedChunk = {
    text: chunk.text,
    words: w.words,
    durationSec: round2(pcmDurationSec(pcm)),
    utf8Bytes: 0, // nothing was sent to the TTS
    model: `recording:${w.model}`,
    voiceId: "clement",
    generatedAt: new Date().toISOString(),
  };
  mkdirSync(resolve(chunk.cachePath, ".."), { recursive: true });
  writeFileSync(chunk.cachePath.replace(/\.json$/, ".wav"), pcmToWav(pcm));
  writeFileSync(chunk.cachePath, JSON.stringify(meta));
  return { pcm, meta };
}

async function synthesizeChunk(chunk: Chunk, cfg: FishConfig, scope: string, force: boolean): Promise<{ pcm: Buffer; meta: CachedChunk }> {
  if (chunk.cached && !force) {
    const meta = JSON.parse(readFileSync(chunk.cachePath, "utf8")) as CachedChunk;
    const pcm = wavToPcm(readFileSync(chunk.cachePath.replace(/\.json$/, ".wav")));
    log.info(scope, `chunk ${chunk.index + 1}: cache hit ${chunk.hash} (${meta.durationSec.toFixed(1)} s)`);
    return { pcm, meta };
  }
  const r = await synthesizeWithTimestamps(chunk.text, cfg, { scope: `${scope}#${chunk.index + 1}` });
  const meta: CachedChunk = {
    text: chunk.text,
    words: r.words,
    durationSec: round2(r.durationSec),
    utf8Bytes: r.utf8Bytes,
    model: cfg.model,
    voiceId: cfg.voiceId,
    generatedAt: new Date().toISOString(),
  };
  mkdirSync(resolve(chunk.cachePath, ".."), { recursive: true });
  writeFileSync(chunk.cachePath.replace(/\.json$/, ".wav"), pcmToWav(r.pcm));
  writeFileSync(chunk.cachePath, JSON.stringify(meta));
  log.info(scope, `chunk ${chunk.index + 1}: ${chunk.text.length} chars -> ${r.durationSec.toFixed(1)} s, cost ${fmtCost(r.utf8Bytes, cfg.model)}`);
  return { pcm: r.pcm, meta };
}

interface SentenceTime {
  paragraph: number;
  sentence: number;
  t: number;
}

async function generateSection(section: SectionDef, lang: Lang, cfg: FishConfig, opts: { force: boolean; dryRun: boolean }): Promise<{ section: ManifestSection; words: FishWord[]; utf8Bytes: number } | undefined> {
  const scope = `${lang}/${section.id}`;
  const script = readFileSync(scriptPath(section, lang), "utf8");
  const paragraphs = splitParagraphs(script);
  const recording = recordingPath(section, lang);
  const chunks = planChunks(section, lang, paragraphs, cfg, recording);
  const totalBytes = chunks.reduce((a, c) => a + Buffer.byteLength(c.text, "utf8"), 0);
  const toGenerate = chunks.filter((c) => !c.cached || opts.force);
  log.step(
    recording
      ? `${scope}: ${paragraphs.length} paragraphs, recorded take ${recording.split("/").pop()}, ${fmtBytes(totalBytes)} of script`
      : `${scope}: ${paragraphs.length} paragraphs, ${chunks.length} request(s), ${fmtBytes(totalBytes)} of text, ${toGenerate.length} to synthesize (${fmtCost(toGenerate.reduce((a, c) => a + Buffer.byteLength(c.text, "utf8"), 0), cfg.model)})`,
  );
  for (const c of chunks) {
    log.info(scope, `  chunk ${c.index + 1}: paragraphs ${c.paragraphIndexes[0]}-${c.paragraphIndexes.at(-1)}, ${c.text.length} chars, ${c.cached && !opts.force ? "cached" : "to generate"} [${c.hash}]`);
  }
  if (opts.dryRun) return undefined;

  // 1. audio per chunk (sequential: keeps the voice consistent and stays far below the concurrency limit)
  const pcms: Buffer[] = [];
  const allWords: FishWord[] = [];
  const chunkOffsets: number[] = [];
  const sentenceTimes: SentenceTime[] = [];
  let timeline = 0;
  let utf8Bytes = 0;

  for (const chunk of chunks) {
    const { pcm, meta } = recording && (!chunk.cached || opts.force)
      ? await loadRecordedChunk(chunk, section, lang, recording, scope)
      : await synthesizeChunk(chunk, cfg, scope, opts.force);
    utf8Bytes += meta.utf8Bytes;
    if (pcms.length) {
      pcms.push(pcmSilence(GAP_SEC));
      timeline += GAP_SEC;
    }
    chunkOffsets.push(timeline);
    const timer = recording ? spokenTimer(chunk.text, meta.words, lang) : letterTimer(chunk.text, meta.words);
    // sentence start times inside this chunk
    let charCursor = 0;
    chunk.paragraphs.forEach((paragraph, k) => {
      const pIndex = chunk.paragraphIndexes[k]!;
      const paragraphStart = chunk.text.indexOf(paragraph, charCursor);
      charCursor = paragraphStart + paragraph.length;
      splitSentences(paragraph).forEach((s, sIndex) => {
        sentenceTimes.push({ paragraph: pIndex, sentence: sIndex, t: round2(timeline + timer.at(paragraphStart + s.offset + firstLetterIndex(s.text))) });
      });
    });
    for (const w of meta.words) allWords.push({ text: w.text, start: round2(w.start + timeline), end: round2(w.end + timeline) });
    pcms.push(pcm);
    timeline += pcmDurationSec(pcm);
  }

  // 2. assemble + normalise + encode
  const outDir = resolve(PATHS.audioDir, lang);
  mkdirSync(outDir, { recursive: true });
  const tmpWav = resolve(outDir, `${section.id}.tmp.wav`);
  const outMp3 = resolve(outDir, `${section.id}.mp3`);
  writeFileSync(tmpWav, pcmToWav(Buffer.concat(pcms)));
  const norm = await normalizeToMp3(tmpWav, outMp3);
  rmSync(tmpWav);
  const durationSec = round2(await probeDurationSec(outMp3));
  log.info(scope, `mp3 ${fmtBytes(readFileSync(outMp3).length)}, ${fmtDuration(durationSec)}, loudness ${norm.inputI.toFixed(1)} -> -16 LUFS (${norm.gainDb >= 0 ? "+" : ""}${norm.gainDb.toFixed(1)} dB)`);

  // 3. subtitles: one piece per (split) sentence, display text with digits
  const subs: ManifestSub[] = [];
  const timeOf = (p: number, s: number) => sentenceTimes.find((x) => x.paragraph === p && x.sentence === s)?.t ?? 0;
  const chunkTimers: { chunk: Chunk; timer: ChunkTimer }[] = chunks.map((chunk) => {
    const meta = JSON.parse(readFileSync(chunk.cachePath, "utf8")) as CachedChunk;
    return { chunk, timer: recording ? spokenTimer(chunk.text, meta.words, lang) : letterTimer(chunk.text, meta.words) };
  });
  paragraphs.forEach((paragraph, pIndex) => {
    const holder = chunkTimers.find((h) => h.chunk.paragraphIndexes.includes(pIndex))!;
    const chunkOffset = chunkOffsets[holder.chunk.index]!;
    const paragraphStart = holder.chunk.text.indexOf(paragraph);
    splitSentences(paragraph).forEach((s, sIndex) => {
      const pieces = splitLongSentence(s.text);
      let searchFrom = 0;
      pieces.forEach((piece, k) => {
        const pieceOffset = s.text.indexOf(piece, searchFrom);
        searchFrom = pieceOffset + piece.length;
        let t: number;
        if (k === 0) t = timeOf(pIndex, sIndex);
        else t = round2(chunkOffset + holder.timer.at(paragraphStart + s.offset + pieceOffset + firstLetterIndex(piece)));
        if (subs.length === 0) t = 0;
        subs.push({ t, text: toDisplayText(piece, lang).text });
      });
    });
  });

  // 4. photo cues
  const media: ManifestMedia[] = [];
  const cues = loadMediaCues(lang)[section.id] ?? [];
  for (const cue of cues) {
    const paragraph = paragraphs[cue.anchor.paragraph];
    if (!paragraph) throw new Error(`${scope}: cue ${cue.img} points at missing paragraph ${cue.anchor.paragraph}`);
    const sentences = splitSentences(paragraph).map((x) => x.text);
    const r = resolveAnchor(sentences, cue.anchor.startsWith);
    if (!r.exact) log.warn(scope, `cue ${cue.img}: anchor "${cue.anchor.startsWith}" not found in paragraph ${cue.anchor.paragraph}, using its first sentence`);
    const dims = await photoOutputDims(cue.img);
    const t = Math.max(0, Math.round((timeOf(cue.anchor.paragraph, r.index) + (cue.offsetSec ?? 0)) * 100) / 100);
    const route = cue.route ? await buildRoute(cue.route, allWords, t, scope) : undefined;
    const offensive = cue.offensive ? await buildCampaign(cue.offensive, allWords, t, scope, "offensive") : undefined;
    const strategic = cue.strategic ? await buildCampaign(cue.strategic, allWords, t, scope, "strategic") : undefined;
    media.push({ t, img: R2_KEYS.photo(cue.img), cap: cue.cap, ...dims,
      ...(isClip(cue.img) ? { video: R2_KEYS.clip(cue.img) } : {}),
      ...(cue.pos ? { pos: cue.pos } : {}), ...(route ? { route } : {}),
      ...(offensive ? { offensive } : {}), ...(strategic ? { strategic } : {}) });
  }
  media.sort((a, b) => a.t - b.t);
  log.info(scope, `${subs.length} subtitles, ${media.length} photo cues, ${allWords.length} words`);

  return {
    section: {
      id: section.id,
      index: section.index,
      audio: R2_KEYS.audio(lang, section.id),
      durationSec,
      sourceHash: recording ? shortHash(script, "recording", fileSha(recording)) : shortHash(script, cfg.voiceId, cfg.model),
      subs,
      media,
    },
    words: allWords,
    utf8Bytes,
  };
}

async function main() {
  const args = parseArgs();
  const langs = parseLangs(args.get("lang"));
  const sections = args.get("section") ? [sectionById(args.get("section")!)] : SECTIONS;
  const force = args.has("force");
  const dryRun = args.has("dry-run");
  await assertFfmpeg();
  log.step(`generate-audio: ${langs.join(",")} x ${sections.map((s) => s.id).join(",")}${force ? " | FORCE (ignore cache)" : ""}${dryRun ? " | DRY RUN" : ""}`);

  const t0 = Date.now();
  let totalBytes = 0;
  let lastModel = "";
  for (const lang of langs) {
    const cfg = fishConfigFromEnv(lang);
    lastModel = cfg.model;
    log.info(lang, `model ${cfg.model}, voice ${cfg.voiceId.slice(0, 8)}… (${process.env[`FISH_AUDIO_VOICE_ID_${lang.toUpperCase()}`] ? `FISH_AUDIO_VOICE_ID_${lang.toUpperCase()}` : "FISH_AUDIO_VOICE_ID"}), T=${cfg.temperature} top_p=${cfg.topP}`);
    const fresh: ManifestSection[] = [];
    const freshWords: Record<string, FishWord[]> = {};
    for (const section of sections) {
      const r = await generateSection(section, lang, cfg, { force, dryRun });
      if (!r) continue;
      fresh.push(r.section);
      freshWords[section.id] = r.words;
      totalBytes += r.utf8Bytes;
    }
    if (dryRun) continue;
    const manifest = writeManifest(lang, { provider: "fish-audio", voiceId: cfg.voiceId, model: cfg.model }, fresh, freshWords);
    const missing = SECTIONS.filter((s) => !manifest.sections.some((m) => m.id === s.id)).map((s) => s.id);
    log.step(`${lang}: manifest written with ${manifest.sections.length}/9 sections, total ${fmtDuration(manifest.totalDurationSec)}${missing.length ? ` (missing: ${missing.join(", ")})` : ""} -> ${resolve(PATHS.manifestDir, `${lang}.json`)}`);
  }
  if (!dryRun) log.info("done", `${((Date.now() - t0) / 1000).toFixed(0)} s, ${fmtBytes(totalBytes)} of text synthesized or reused, list cost ${fmtCost(totalBytes, lastModel)}`);
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
