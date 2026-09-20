/**
 * What one photo actually looks like in the player's photo well.
 *
 *   pnpm tsx scripts/self-guided/tools/preview-well.ts --img p16_11 [--pos "42% 58%"] [--well 390x371]
 *   pnpm tsx scripts/self-guided/tools/preview-well.ts --section 03-fall-of-paris [--lang fr]
 *
 * The well is `object-fit: cover`, and it is *not* the shape of the photos: on
 * an iPhone 14 it is about 0.95:1 (358 x 371 px), on an iPhone SE about 1.17:1.
 * So a landscape photo loses its sides and a portrait loses its top and bottom,
 * and `media[].pos` — the `object-position` the manifest carries — is the only
 * way to say what must survive that. This reproduces the crop exactly, which is
 * the only way to choose a `pos` without a handset in hand.
 *
 * With `--section` it lays every cue of that section on one sheet, each already
 * cropped, with its own `pos` applied.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { manifestPath, type Manifest } from "../lib/manifest.ts";
import { photoOutputPath } from "../lib/photos.ts";
import { PATHS, type Lang } from "../lib/sections.ts";

/** `object-position` as two fractions; "50% 20%" -> [0.5, 0.2]. */
function parsePos(pos: string | undefined): [number, number] {
  if (!pos) return [0.5, 0.5];
  const [x, y] = pos.trim().split(/\s+/).map((v) => Number(v.replace("%", "")) / 100);
  return [Number.isFinite(x) ? x! : 0.5, Number.isFinite(y) ? y! : 0.5];
}

/** Crop and scale a photo the way `object-fit: cover` + `object-position` do. */
export async function toWell(file: string, well: [number, number], pos?: string): Promise<Buffer> {
  const [ww, wh] = well;
  const meta = await sharp(file, { pages: 1 }).metadata();
  const W = meta.width!;
  const H = meta.height!;
  const k = Math.max(ww / W, wh / H);
  const cw = Math.min(W, Math.round(ww / k));
  const ch = Math.min(H, Math.round(wh / k));
  const [px, py] = parsePos(pos);
  return sharp(file, { pages: 1 })
    .extract({
      left: Math.round((W - cw) * px),
      top: Math.round((H - ch) * py),
      width: cw,
      height: ch,
    })
    .resize(ww, wh)
    .png()
    .toBuffer();
}

const WELLS: Record<string, [number, number]> = {
  "iphone-14": [390, 371],
  "iphone-se": [375, 293],
};

(async () => {
  const args = parseArgs();
  const well = (args.get("well") ?? "390x371").split("x").map(Number) as [number, number];
  const label = Object.entries(WELLS).find(([, w]) => w[0] === well[0] && w[1] === well[1])?.[0] ?? `${well[0]}x${well[1]}`;

  const one = args.get("img");
  if (one) {
    const png = await toWell(photoOutputPath(one), well, args.get("pos"));
    const out = resolve(PATHS.outputDir, `well-${one}.png`);
    writeFileSync(out, png);
    log.info("puits", `${out} — ${one}, pos ${args.get("pos") ?? "50% 50%"}, puits ${label}`);
    return;
  }

  const lang = (args.get("lang") ?? "fr") as Lang;
  const sectionId = args.get("section") ?? "03-fall-of-paris";
  const manifest = JSON.parse(readFileSync(manifestPath(lang), "utf8")) as Manifest;
  const section = manifest.sections.find((s) => s.id === sectionId);
  if (!section) throw new Error(`no section ${sectionId} in ${lang}`);

  const cols = 4;
  const gap = 10;
  const cap = 22;
  const rows = Math.ceil(section.media.length / cols);
  const tiles = await Promise.all(section.media.map(async (m, i) => {
    const name = m.img.split("/").pop()!.replace(/\.webp$/, "");
    const stamp = `${Math.floor(m.t / 60)}:${String(Math.floor(m.t % 60)).padStart(2, "0")}`;
    const png = await toWell(photoOutputPath(name), well, m.pos);
    const tag = Buffer.from(
      `<svg width="${well[0]}" height="${cap}" xmlns="http://www.w3.org/2000/svg">
         <text x="2" y="16" font-family="Helvetica,Arial,sans-serif" font-size="14" fill="#F7F3EC">${stamp}  ${name}${m.pos ? `  (${m.pos})` : ""}</text>
       </svg>`);
    return [
      { input: png, left: gap + (i % cols) * (well[0] + gap), top: gap + Math.floor(i / cols) * (well[1] + cap + gap) },
      { input: tag, left: gap + (i % cols) * (well[0] + gap), top: gap + Math.floor(i / cols) * (well[1] + cap + gap) + well[1] },
    ];
  }));

  const out = resolve(PATHS.outputDir, `well-${lang}-${sectionId}.png`);
  await sharp({
    create: {
      width: gap + cols * (well[0] + gap),
      height: gap + rows * (well[1] + cap + gap),
      channels: 3, background: "#1C1714",
    },
  }).composite(tiles.flat()).png().toFile(out);
  log.info("puits", `${out} — ${section.media.length} cues de ${sectionId} (${lang}), puits ${label}`);
})();
