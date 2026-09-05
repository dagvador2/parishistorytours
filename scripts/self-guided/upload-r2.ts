/**
 * Upload the generated assets to the private R2 bucket.
 *
 *   pnpm self-guided:upload [--dry-run] [--force] [--only audio,manifest,pdf,photos,preview]
 *
 * Bucket layout (contract with the webapp):
 *   audio/left-bank-ww2/<lang>/<id>.mp3     manifest/left-bank-ww2/<lang>.json (+ .words.json)
 *   pdf/left-bank-ww2/<lang>/master.pdf     photos/left-bank-ww2/<name>.webp
 *   preview/left-bank-ww2/<lang>/intro-30s.mp3 | pdf-preview.pdf
 *
 * Idempotent: an object whose MD5 matches the remote ETag is skipped (unless
 * --force). Missing local files are reported, never fatal, so the FR assets can
 * ship before the EN ones exist.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "./lib/args.ts";
import { fmtBytes, log } from "./lib/log.ts";
import { manifestPath, wordsPath } from "./lib/manifest.ts";
import { listPhotoNames, photoOutputPath } from "./lib/photos.ts";
import { assertBucket, cacheControlFor, contentTypeFor, md5Hex, putFile, r2Client, r2ConfigFromEnv, remoteEtag } from "./lib/r2.ts";
import { LANGS, PATHS, R2_KEYS, SECTIONS, pdfMasterPath } from "./lib/sections.ts";

type Group = "audio" | "manifest" | "pdf" | "photos" | "preview";
interface Item {
  group: Group;
  key: string;
  file: string;
}

function plan(): Item[] {
  const items: Item[] = [];
  for (const lang of LANGS) {
    for (const s of SECTIONS) items.push({ group: "audio", key: R2_KEYS.audio(lang, s.id), file: resolve(PATHS.audioDir, lang, `${s.id}.mp3`) });
    items.push({ group: "manifest", key: R2_KEYS.manifest(lang), file: manifestPath(lang) });
    items.push({ group: "manifest", key: R2_KEYS.words(lang), file: wordsPath(lang) });
    items.push({ group: "pdf", key: R2_KEYS.pdf(lang), file: pdfMasterPath(lang) });
    items.push({ group: "preview", key: R2_KEYS.previewAudio(lang), file: resolve(PATHS.previewDir, lang, "intro-30s.mp3") });
    items.push({ group: "preview", key: R2_KEYS.previewPdf(lang), file: resolve(PATHS.previewDir, lang, "pdf-preview.pdf") });
  }
  for (const name of listPhotoNames()) items.push({ group: "photos", key: R2_KEYS.photo(name), file: photoOutputPath(name) });
  return items;
}

async function main() {
  const args = parseArgs();
  const dryRun = args.has("dry-run");
  const force = args.has("force");
  const only = args.get("only")?.split(",").map((s) => s.trim() as Group);
  const cfg = r2ConfigFromEnv();
  const client = r2Client(cfg);
  log.step(`upload-r2: bucket ${cfg.bucket} @ ${cfg.accountId.slice(0, 6)}…${dryRun ? " | DRY RUN" : ""}${force ? " | FORCE" : ""}${only ? ` | only ${only.join(",")}` : ""}`);
  await assertBucket(client, cfg.bucket);

  const items = plan().filter((i) => !only || only.includes(i.group));
  let uploaded = 0;
  let skipped = 0;
  let missing = 0;
  let bytes = 0;
  for (const item of items) {
    if (!existsSync(item.file)) {
      missing++;
      log.warn(item.group, `missing locally, not uploaded: ${item.key}`);
      continue;
    }
    const body = readFileSync(item.file);
    const local = md5Hex(body);
    const remote = await remoteEtag(client, cfg.bucket, item.key);
    if (remote === local && !force) {
      skipped++;
      log.info(item.group, `= ${item.key} (unchanged)`);
      continue;
    }
    const size = statSync(item.file).size;
    bytes += size;
    const verb = remote ? "~" : "+";
    if (dryRun) {
      log.info(item.group, `${verb} ${item.key} (${fmtBytes(size)}) would upload`);
    } else {
      await putFile(client, cfg.bucket, item.key, item.file, contentTypeFor(item.key), cacheControlFor(item.key));
      log.info(item.group, `${verb} ${item.key} (${fmtBytes(size)})`);
    }
    uploaded++;
  }
  log.step(`${dryRun ? "would upload" : "uploaded"} ${uploaded} object(s), ${fmtBytes(bytes)}; ${skipped} unchanged; ${missing} missing locally`);
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
