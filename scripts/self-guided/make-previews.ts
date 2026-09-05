/**
 * Marketing previews for the product page (chantier C):
 *   preview/left-bank-ww2/<lang>/intro-30s.mp3    first 30 s of the intro, 2 s fade-out
 *   preview/left-bank-ww2/<lang>/pdf-preview.pdf  first 3 pages of the PDF master
 *
 *   pnpm self-guided:previews [--lang en|fr|both] [--upload]
 *
 * Writes to output/preview/<lang>/; --upload pushes just the preview group to R2
 * (same as `pnpm self-guided:upload --only preview`).
 *
 * The masters declare all 33 photos in every page's resources, so a naive
 * 3-page copy weighs as much as the whole guide (5 MB). Unused XObjects are
 * pruned from the copied pages first: the preview lands around 200 KB.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef, decodePDFRawStream } from "pdf-lib";
import { parseArgs } from "./lib/args.ts";
import { assertFfmpeg, excerptMp3, probeDurationSec } from "./lib/ffmpeg.ts";
import { fmtBytes, log } from "./lib/log.ts";
import { PATHS, parseLangs, pdfMasterPath } from "./lib/sections.ts";

const PREVIEW_SECONDS = 30;
const PREVIEW_PAGES = 3;

/** Names of XObjects actually drawn (`/Name Do`) by a page's content stream(s). */
function usedXObjects(doc: PDFDocument, pageIndex: number): Set<string> {
  const page = doc.getPage(pageIndex);
  const contents = page.node.Contents();
  const streams: PDFRawStream[] = [];
  const push = (obj: unknown) => {
    const resolved = obj instanceof PDFRef ? doc.context.lookup(obj) : obj;
    if (resolved instanceof PDFRawStream) streams.push(resolved);
    else if (resolved instanceof PDFArray) resolved.asArray().forEach(push);
  };
  push(contents);
  const used = new Set<string>();
  for (const s of streams) {
    const text = Buffer.from(decodePDFRawStream(s).decode()).toString("latin1");
    for (const m of text.matchAll(/\/([^\s/[\]<>()]+)\s+Do\b/g)) used.add(m[1]!);
  }
  return used;
}

/** Drop XObjects none of the kept pages draw, so copyPages does not drag the whole guide along. */
function pruneUnusedXObjects(doc: PDFDocument, pageIndexes: number[]): number {
  const keep = new Set<string>();
  for (const i of pageIndexes) for (const n of usedXObjects(doc, i)) keep.add(n);
  let removed = 0;
  for (const i of pageIndexes) {
    const res = doc.getPage(i).node.Resources();
    const xo = res?.get(PDFName.of("XObject"));
    const dict = xo instanceof PDFRef ? doc.context.lookup(xo) : xo;
    if (!(dict instanceof PDFDict)) continue;
    for (const [key] of dict.entries()) {
      if (!keep.has(key.decodeText())) {
        dict.delete(key);
        removed++;
      }
    }
  }
  return removed;
}

async function main() {
  const args = parseArgs();
  await assertFfmpeg();
  for (const lang of parseLangs(args.get("lang"))) {
    const dir = resolve(PATHS.previewDir, lang);
    mkdirSync(dir, { recursive: true });
    log.step(`make-previews ${lang}`);

    const intro = resolve(PATHS.audioDir, lang, "01-intro.mp3");
    if (existsSync(intro)) {
      const out = resolve(dir, "intro-30s.mp3");
      await excerptMp3(intro, out, PREVIEW_SECONDS, 2);
      log.info(lang, `intro-30s.mp3: ${(await probeDurationSec(out)).toFixed(1)} s, ${fmtBytes(statSync(out).size)}`);
    } else {
      log.warn(lang, `no 01-intro.mp3 yet (${intro}), audio preview skipped`);
    }

    const master = pdfMasterPath(lang);
    const src = await PDFDocument.load(readFileSync(master));
    const indexes = Array.from({ length: Math.min(PREVIEW_PAGES, src.getPageCount()) }, (_, i) => i);
    let pruned = 0;
    try {
      pruned = pruneUnusedXObjects(src, indexes);
    } catch (e) {
      log.warn(lang, `could not prune unused images (${e instanceof Error ? e.message : e}), preview will be heavy`);
    }
    const preview = await PDFDocument.create();
    const pages = await preview.copyPages(src, indexes);
    for (const p of pages) preview.addPage(p);
    preview.setTitle(`${src.getTitle() ?? "WWII Left Bank Tour"} — preview`);
    preview.setProducer("parishistorytours.com");
    const out = resolve(dir, "pdf-preview.pdf");
    writeFileSync(out, await preview.save());
    log.info(lang, `pdf-preview.pdf: ${pages.length} of ${src.getPageCount()} pages, ${pruned} unused image(s) pruned, ${fmtBytes(statSync(out).size)}`);
  }
  if (args.has("upload")) {
    const r = spawnSync(process.execPath, ["--import", "tsx", resolve(PATHS.root, "scripts/self-guided/upload-r2.ts"), "--only", "preview"], { stdio: "inherit" });
    process.exit(r.status ?? 1);
  }
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
