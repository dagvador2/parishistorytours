/**
 * Contact sheet of the handoff photos, to review framing and choices in one
 * look instead of opening sixty files.
 *
 *   pnpm tsx scripts/self-guided/tools/contact-sheet.ts [--filter n3] [--out path] [--crop]
 *
 * `--crop` renders each cell the way the webapp does (1.3:1 well,
 * object-fit: cover), which is what shows whether a portrait loses its head.
 */
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { parseArgs } from "../lib/args.ts";
import { PATHS } from "../lib/sections.ts";

const CELL = 320;
const LABEL = 26;
const COLS = 5;

async function main() {
  const args = parseArgs();
  const dir = resolve(PATHS.handoffDir, "photos");
  const filter = args.get("filter");
  const crop = args.has("crop");
  const out = args.get("out") ?? resolve(PATHS.outputDir, "contact-sheet.jpg");
  const files = readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && (!filter || f.includes(filter)))
    .sort();
  if (!files.length) throw new Error(`no photo matches ${filter ?? "*"} in ${dir}`);

  const cellH = crop ? Math.round(CELL / 1.3) : CELL;
  const rows = Math.ceil(files.length / COLS);
  const W = COLS * CELL;
  const H = rows * (cellH + LABEL);
  const composites: sharp.OverlayOptions[] = [];
  let labels = "";
  for (const [i, f] of files.entries()) {
    const x = (i % COLS) * CELL;
    const y = Math.floor(i / COLS) * (cellH + LABEL);
    const buf = await sharp(resolve(dir, f), { pages: 1 })
      .resize(CELL - 6, cellH - 6, { fit: crop ? "cover" : "contain", background: "#111" })
      .toBuffer();
    composites.push({ input: buf, left: x + 3, top: y + LABEL });
    labels += `<text x="${x + 4}" y="${y + 17}" font-family="monospace" font-size="13" fill="#fff">${f.replace(/\.[^.]+$/, "")}</text>`;
  }
  const svg = Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#111"/>${labels}</svg>`);
  await sharp(svg).composite(composites).jpeg({ quality: 78 }).toFile(out);
  console.log(`${out} — ${files.length} images${crop ? " (cropped as the player's well)" : ""}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
