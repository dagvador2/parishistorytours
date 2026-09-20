/**
 * Render a live campaign map as the player draws it, at a given second.
 *
 *   pnpm tsx scripts/self-guided/tools/preview-campaign-map.ts [--map offensive] [--lang fr] [--at 20]
 *   pnpm tsx scripts/self-guided/tools/preview-campaign-map.ts --map strategic --contact
 *   pnpm tsx scripts/self-guided/tools/preview-campaign-map.ts --at 20 --well 390x371
 *
 * `--map` picks between the May 1940 offensive (the default) and the 1944
 * Allied advance at the last stop.
 *
 * The map is drawn in the browser, so there is nothing to look at in the
 * pipeline's output. This calls `campaignScene()` — the very function the
 * component calls — and writes its shapes out as SVG, so the picture cannot
 * drift from the page: there is one drawing, rendered twice.
 *
 * `--contact` lays a frame for every beat on one sheet, which is the quickest
 * way to see the whole eighty seconds at once. `--well WxH` crops the frame the
 * way a handset does (`object-fit: cover`); the well is about 0.95:1 on an
 * iPhone 14 against the map's 1.3:1, so a seventh of the width goes — this is
 * the check that no type has drifted into what gets cut.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { markerDefsSvg, campaignScene, shapesToSvg } from "../../../src/components/self-guided/campaignScene.ts";
import type { CampaignGeography } from "../../../src/data/self-guided/campaign-map.ts";
import type { Lang as UiLang } from "../../../src/data/self-guided/left-bank-ww2.ts";
import { OFFENSIVE_GEO } from "../../../src/data/self-guided/offensive-1940.ts";
import { STRATEGIC_GEO } from "../../../src/data/self-guided/strategic-1944.ts";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { manifestPath, type Manifest, type ManifestCampaign } from "../lib/manifest.ts";
import { photoOutputPath } from "../lib/photos.ts";
import { PATHS, type Lang } from "../lib/sections.ts";

const nameOf = (key: string) => key.split("/").pop()!.replace(/\.webp$/, "");

/**
 * The portrait travels inline: the renderer will not reach out to the
 * filesystem. PNG, not the WebP the browser gets — librsvg decodes neither
 * WebP nor a remote URL, and silently draws nothing when it cannot.
 */
async function dataUri(key: string): Promise<string> {
  const png = await sharp(photoOutputPath(nameOf(key))).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

interface Spec { w: number; h: number; img: string; campaign: ManifestCampaign; geo: CampaignGeography }

async function frame(cue: Spec, lang: UiLang, at: number): Promise<Buffer> {
  const shapes = campaignScene({
    W: cue.w, H: cue.h, proj: cue.campaign.proj, credit: cue.campaign.credit, lang, geo: cue.geo,
    beats: await Promise.all(cue.campaign.beats.map(async (b) => ({ move: b.move, at: b.at, ...(b.img ? { img: await dataUri(b.img) } : {}) }))),
    t: at,
  });
  const svg = `<svg width="${cue.w}" height="${cue.h}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${markerDefsSvg()}${shapesToSvg(shapes)}</svg>`;
  return sharp(photoOutputPath(nameOf(cue.img)))
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png().toBuffer();
}

/** Crop to a handset's photo well, exactly as `object-fit: cover` would. */
async function toWell(png: Buffer, W: number, H: number, well: string): Promise<Buffer> {
  const [ww, wh] = well.split("x").map(Number);
  if (!ww || !wh) throw new Error(`--well expects WxH, got "${well}"`);
  const k = Math.max(ww / W, wh / H);
  const cw = Math.round(ww / k);
  const ch = Math.round(wh / k);
  return sharp(png)
    .extract({ left: Math.round((W - cw) / 2), top: Math.round((H - ch) / 2), width: cw, height: ch })
    .resize(ww, wh).png().toBuffer();
}

(async () => {
  const args = parseArgs();
  const lang = (args.get("lang") ?? "fr") as Lang;
  const map = (args.get("map") ?? "offensive") as "offensive" | "strategic";
  const manifest = JSON.parse(readFileSync(manifestPath(lang), "utf8")) as Manifest;
  const cue = manifest.sections.flatMap((s) => s.media).find((m) => m[map]);
  const campaign = cue?.[map];
  if (!cue || !campaign) throw new Error(`${lang}: no ${map} cue in any section`);
  const spec: Spec = { w: cue.w, h: cue.h, img: cue.img, campaign, geo: map === "strategic" ? STRATEGIC_GEO : OFFENSIVE_GEO };
  const well = args.get("well");

  if (args.has("contact")) {
    // One frame a second after each beat, so every arrow is caught mid-draw.
    const times = spec.campaign.beats.map((b) => b.at + 1.2);
    const cols = 3;
    const cell = 560;
    const ch = Math.round((cell * spec.h) / spec.w);
    const rows = Math.ceil(times.length / cols);
    const tiles = await Promise.all(times.map(async (at, i) => ({
      input: await sharp(await frame(spec, lang, at)).resize(cell, ch).png().toBuffer(),
      left: (i % cols) * cell, top: Math.floor(i / cols) * ch,
    })));
    const out = resolve(PATHS.outputDir, `${map}-contact-${lang}.png`);
    await sharp({ create: { width: cols * cell, height: rows * ch, channels: 3, background: "#1C1714" } })
      .composite(tiles).png().toFile(out);
    log.info("aperçu", `${out} — ${times.length} instants (${times.map((t) => t.toFixed(0) + "s").join(" ")})`);
    return;
  }

  const at = Number(args.get("at") ?? Math.max(...spec.campaign.beats.map((b) => b.at)) + 3);
  let png = await frame(spec, lang, at);
  if (well) png = await toWell(png, spec.w, spec.h, well);
  const out = resolve(PATHS.outputDir, `${map}-${lang}-${at.toFixed(0)}s${well ? `-${well}` : ""}.png`);
  writeFileSync(out, png);
  log.info("aperçu", `${out} — ${at.toFixed(1)} s, ${spec.campaign.beats.filter((b) => b.at <= at).length}/${spec.campaign.beats.length} beats${well ? `, rogné pour un puits ${well}` : ""}`);
})();
