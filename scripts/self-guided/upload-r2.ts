/**
 * Upload the generated assets to the private R2 bucket.
 *
 *   pnpm self-guided:upload [--dry-run] [--force] [--lang en|fr|both] [--only audio,manifest,pdf,photos,preview]
 *
 * Bucket layout (contract with the webapp):
 *   audio/left-bank-ww2/<lang>/<id>.mp3     manifest/left-bank-ww2/<lang>.json (+ .words.json)
 *   pdf/left-bank-ww2/<lang>/master.pdf     photos/left-bank-ww2/<name>.webp
 *   preview/left-bank-ww2/<lang>/intro-30s.mp3 | itinerary.mp3 | pdf-preview.pdf
 *
 * `--only masters` is separate from all of the above: it copies the *sources*
 * the webapp never serves — voice masters, source PNGs, camera originals — so
 * they exist somewhere other than the guide's laptop. They stay on disk (the
 * build reads them) and out of git (they would weigh the repository down).
 *
 * Idempotent: an object whose MD5 matches the remote ETag is skipped (unless
 * --force). Missing local files are reported, never fatal, so the FR assets can
 * ship before the EN ones exist.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { parseArgs } from "./lib/args.ts";
import { fmtBytes, log } from "./lib/log.ts";
import { manifestPath, wordsPath } from "./lib/manifest.ts";
import { clipOutputPath, isClip, listPhotoNames, photoOutputPath } from "./lib/photos.ts";
import { assertBucket, cacheControlFor, contentTypeFor, md5Hex, putFile, r2Client, r2ConfigFromEnv, remoteEtag } from "./lib/r2.ts";
import { PATHS, R2_KEYS, SECTIONS, parseLangs, pdfMasterPath, type Lang } from "./lib/sections.ts";

type Group = "audio" | "manifest" | "pdf" | "photos" | "preview" | "masters";
interface Item {
  group: Group;
  key: string;
  file: string;
}

/** Every file under a directory, depth first, as paths relative to `root`. */
function walk(dir: string, root: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue; // .DS_Store and friends
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(full, root, out);
    else out.push(relative(root, full));
  }
  return out;
}

/**
 * The sources behind the generated assets. Nothing here is ever served: it is
 * the material a section is rebuilt from, and it exists in one copy only.
 */
function masterItems(): Item[] {
  const dirs = [
    { base: PATHS.sourceDir, sub: "recordings", prefix: "recordings" },
    { base: PATHS.handoffDir, sub: "photos", prefix: "handoff/photos" },
    { base: PATHS.handoffDir, sub: "originals", prefix: "handoff/originals" },
    { base: PATHS.handoffDir, sub: "video", prefix: "handoff/video" },
  ];
  const items: Item[] = [];
  for (const d of dirs) {
    const root = resolve(d.base, d.sub);
    for (const rel of walk(root, root)) {
      items.push({ group: "masters", key: R2_KEYS.master(`${d.prefix}/${rel}`), file: resolve(root, rel) });
    }
  }
  return items;
}

function plan(langs: Lang[], only?: Group[]): Item[] {
  const items: Item[] = [];
  for (const lang of langs) {
    for (const s of SECTIONS) items.push({ group: "audio", key: R2_KEYS.audio(lang, s.id), file: resolve(PATHS.audioDir, lang, `${s.id}.mp3`) });
    items.push({ group: "manifest", key: R2_KEYS.manifest(lang), file: manifestPath(lang) });
    items.push({ group: "manifest", key: R2_KEYS.words(lang), file: wordsPath(lang) });
    items.push({ group: "pdf", key: R2_KEYS.pdf(lang), file: pdfMasterPath(lang) });
    items.push({ group: "preview", key: R2_KEYS.previewAudio(lang), file: resolve(PATHS.previewDir, lang, "intro-30s.mp3") });
    items.push({ group: "preview", key: R2_KEYS.previewItinerary(lang), file: resolve(PATHS.previewDir, lang, "itinerary.mp3") });
    items.push({ group: "preview", key: R2_KEYS.previewPdf(lang), file: resolve(PATHS.previewDir, lang, "pdf-preview.pdf") });
  }
  for (const name of listPhotoNames()) {
    items.push({ group: "photos", key: R2_KEYS.photo(name), file: photoOutputPath(name) });
    // a clip goes up beside its poster, under the same name
    if (isClip(name)) items.push({ group: "photos", key: R2_KEYS.clip(name), file: clipOutputPath(name) });
  }
  // Opt-in only: 250 MB of sources have no business riding along with a routine upload.
  if (only?.includes("masters")) items.push(...masterItems());
  return items;
}

async function main() {
  const args = parseArgs();
  const dryRun = args.has("dry-run");
  const force = args.has("force");
  const only = args.get("only")?.split(",").map((s) => s.trim() as Group);
  const langs = parseLangs(args.get("lang"));
  const cfg = r2ConfigFromEnv();
  const client = r2Client(cfg);
  log.step(`upload-r2: bucket ${cfg.bucket} @ ${cfg.accountId.slice(0, 6)}…${dryRun ? " | DRY RUN" : ""}${force ? " | FORCE" : ""}${only ? ` | only ${only.join(",")}` : ""} | langs ${langs.join(",")}`);
  await assertBucket(client, cfg.bucket);

  const items = plan(langs, only).filter((i) => !only || only.includes(i.group));
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
