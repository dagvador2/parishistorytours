/**
 * Create a Fish Audio voice clone from recorded samples (one clone per language:
 * a clone trained on French takes reads English with a heavy French accent).
 *
 *   pnpm tsx scripts/self-guided/tools/create-voice.ts --list
 *   pnpm tsx scripts/self-guided/tools/create-voice.ts --dir scripts/audio-source/voice-samples/en --title "Voix de guide EN" [--lang en]
 *
 * --dir  : folder with 1-20 audio files (m4a/mp3/wav). If a file has a sibling
 *          .txt with the same base name, it is sent as the transcript
 *          (otherwise Fish runs ASR on it).
 * Prints the new model id: set FISH_AUDIO_VOICE_ID_<LANG> in .env.
 *
 * API: POST https://api.fish.audio/model (multipart/form-data)
 *      https://docs.fish.audio/api-reference/endpoint/model/create-model
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { parseArgs } from "../lib/args.ts";
import { requireEnv } from "../lib/env.ts";
import { fmtBytes, log } from "../lib/log.ts";

const API = "https://api.fish.audio";
const AUDIO_EXT = new Set([".m4a", ".mp3", ".wav", ".aac", ".flac", ".ogg", ".mp4"]);
const MIME: Record<string, string> = { ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".aac": "audio/aac", ".flac": "audio/flac", ".ogg": "audio/ogg" };

async function listModels(apiKey: string) {
  const res = await fetch(`${API}/model?self=true&page_size=50`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { total: number; items: { _id: string; title: string; languages: string[]; state: string; created_at: string; visibility: string }[] };
  log.info("models", `${data.total} model(s) on this account`);
  for (const m of data.items) console.log(`  ${m._id}  ${m.title.padEnd(24)} ${(m.languages ?? []).join(",").padEnd(6)} ${m.state.padEnd(8)} ${m.visibility.padEnd(8)} ${m.created_at.slice(0, 10)}`);
}

async function createModel(apiKey: string, dir: string, title: string, lang: string | undefined) {
  if (!existsSync(dir)) throw new Error(`no such directory: ${dir}`);
  const files = readdirSync(dir)
    .filter((f) => AUDIO_EXT.has(extname(f).toLowerCase()))
    .sort();
  if (files.length === 0 || files.length > 20) throw new Error(`need 1-20 audio files in ${dir}, found ${files.length}`);

  const form = new FormData();
  form.append("type", "tts");
  form.append("train_mode", "fast");
  form.append("visibility", "unlist");
  form.append("title", title);
  form.append("description", `Paris History Tours narration voice (${lang ?? "any"}), cloned ${new Date().toISOString().slice(0, 10)}`);
  form.append("enhance_audio_quality", "true");
  let total = 0;
  let transcripts = 0;
  for (const f of files) {
    const p = resolve(dir, f);
    const bytes = readFileSync(p);
    total += bytes.length;
    form.append("voices", new Blob([bytes], { type: MIME[extname(f).toLowerCase()] ?? "application/octet-stream" }), f);
    const txt = resolve(dir, basename(f, extname(f)) + ".txt");
    if (existsSync(txt)) {
      form.append("texts", readFileSync(txt, "utf8").trim());
      transcripts++;
    }
    log.info("upload", `${f} (${fmtBytes(statSync(p).size)})${existsSync(txt) ? " + transcript" : ""}`);
  }
  if (transcripts && transcripts !== files.length) throw new Error("either every sample has a .txt transcript or none (Fish pairs texts[] with voices[] by index)");
  log.info("create", `${files.length} file(s), ${fmtBytes(total)} -> POST /model "${title}"`);

  const res = await fetch(`${API}/model`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const model = (await res.json()) as { _id: string; state: string; title: string };
  log.info("created", `model ${model._id} (${model.state}) "${model.title}"`);
  console.log(`\nAdd to .env:\n  FISH_AUDIO_VOICE_ID_${(lang ?? "xx").toUpperCase()}=${model._id}\n`);
}

async function main() {
  const args = parseArgs();
  const apiKey = requireEnv("FISH_AUDIO_API_KEY");
  if (args.has("list")) return listModels(apiKey);
  const dir = args.get("dir");
  const title = args.get("title");
  if (!dir || !title) throw new Error("usage: --list | --dir <folder> --title <name> [--lang en|fr]");
  await createModel(apiKey, resolve(dir), title, args.get("lang"));
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
