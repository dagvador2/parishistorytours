/**
 * Marketing previews for the product page (chantier C):
 *   preview/left-bank-ww2/<lang>/intro-30s.mp3    first 30 s of the intro, 2 s fade-out
 *   preview/left-bank-ww2/<lang>/itinerary.mp3    the passage where the walk is described
 *   preview/left-bank-ww2/<lang>/pdf-preview.pdf  first 3 pages of the PDF master
 *
 *   pnpm self-guided:previews [--lang en|fr|both] [--upload]
 *
 * Writes to output/preview/<lang>/; --upload pushes just the preview group to R2
 * (same as `pnpm self-guided:upload --only preview`).
 *
 * The itinerary excerpt is cut on the route-map cue of `01-intro`, so it starts
 * exactly where Clément starts naming the places — and its beat times, written
 * to src/data/self-guided/route-preview.json, are already relative to the cut.
 * The product page animates the same map on them. Re-record the intro, run this
 * again, and the excerpt and the animation move together.
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
import { assertFfmpeg, excerptMp3, probeDurationSec, sliceMp3 } from "./lib/ffmpeg.ts";
import { fmtBytes, log } from "./lib/log.ts";
import { loadManifest } from "./lib/manifest.ts";
import { PATHS, parseLangs, pdfMasterPath, type Lang } from "./lib/sections.ts";

const PREVIEW_SECONDS = 30;
const PREVIEW_PAGES = 3;

/** Where the product page reads the beats of its animated map. */
const ROUTE_PREVIEW_JSON = resolve(PATHS.root, "src/data/self-guided/route-preview.json");

interface RoutePreview {
  durationSec: number;
  credit: string;
  /** intrinsic size of the basemap, and its normalised Web Mercator bounds */
  w: number;
  h: number;
  proj: { x0: number; x1: number; y0: number; y1: number };
  beats: { stop: string; at: number }[];
}

/** Seconds of narration kept before the first place is named. */
const LEAD_SEC = 8;

/**
 * Cut the intro on its route-map cue: the passage that walks through the whole
 * itinerary. It ends on the last sentence before the next photo — one subtitle
 * short of it, so the excerpt does not open a thought it will not finish.
 *
 * It does NOT start at the top of the cue. The cue opens on how the tour works,
 * and the map has nothing to draw until Clément starts naming places — a long
 * silent lead-in on a still map. So the cut begins at the last sentence that
 * still leaves `LEAD_SEC` before the first beat.
 */
async function itineraryPreview(lang: Lang, dir: string): Promise<RoutePreview | null> {
  const intro = loadManifest(lang)?.sections.find((s) => s.id === "01-intro");
  if (!intro) return null;
  const cueIndex = intro.media.findIndex((m) => m.route);
  const cue = intro.media[cueIndex];
  if (!cue?.route) {
    log.warn(lang, "no route-map cue in 01-intro, itinerary preview skipped");
    return null;
  }
  const nextCueAt = intro.media[cueIndex + 1]?.t ?? intro.durationSec;
  const lastSub = [...intro.subs].reverse().find((s) => s.t < nextCueAt);
  const end = lastSub && lastSub.t > cue.t ? lastSub.t : nextCueAt;

  const firstBeatAt = cue.t + (cue.route.beats[0]?.at ?? 0);
  const start = [...intro.subs].reverse().find((s) => s.t >= cue.t && s.t <= firstBeatAt - LEAD_SEC)?.t ?? cue.t;

  const src = resolve(PATHS.audioDir, lang, "01-intro.mp3");
  if (!existsSync(src)) {
    log.warn(lang, `no 01-intro.mp3 yet (${src}), itinerary preview skipped`);
    return null;
  }
  const out = resolve(dir, "itinerary.mp3");
  await sliceMp3(src, out, start, end);
  const durationSec = await probeDurationSec(out);
  log.info(lang, `itinerary.mp3: ${start.toFixed(1)}s → ${end.toFixed(1)}s, ${durationSec.toFixed(1)} s, première étape à ${(firstBeatAt - start).toFixed(1)} s, ${fmtBytes(statSync(out).size)}`);
  // Beat times are relative to the cue; the cut starts later than the cue.
  return {
    durationSec: Number(durationSec.toFixed(2)),
    credit: cue.route.credit,
    w: cue.w,
    h: cue.h,
    proj: cue.route.proj,
    beats: cue.route.beats.map((b) => ({ stop: b.stop, at: Number((b.at - (start - cue.t)).toFixed(2)) })),
  };
}

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
  const routePreviews: Partial<Record<Lang, RoutePreview>> = existsSync(ROUTE_PREVIEW_JSON)
    ? JSON.parse(readFileSync(ROUTE_PREVIEW_JSON, "utf8"))
    : {};
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

    const route = await itineraryPreview(lang, dir);
    if (route) routePreviews[lang] = route;

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

  writeFileSync(ROUTE_PREVIEW_JSON, JSON.stringify(routePreviews, null, 2) + "\n");
  log.info("carte", `src/data/self-guided/route-preview.json — ${Object.keys(routePreviews).join(", ") || "vide"}`);

  if (args.has("upload")) {
    const r = spawnSync(process.execPath, ["--import", "tsx", resolve(PATHS.root, "scripts/self-guided/upload-r2.ts"), "--only", "preview"], { stdio: "inherit" });
    process.exit(r.status ?? 1);
  }
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
