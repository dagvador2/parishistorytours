/**
 * Render the final frame of the live route map, as the player will draw it.
 *
 *   pnpm tsx scripts/self-guided/tools/preview-route-map.ts [--section 01-intro] [--at 40]
 *
 * The map is drawn in the browser, so there is nothing to look at in the
 * pipeline's output. This replays the same geometry and the same medallion
 * packing (`src/components/self-guided/routeLayout.ts` — the very module the
 * component uses) over the basemap, and writes a PNG. It is the quickest way
 * to check that four persistent medallions do not collide.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { ROUTE, STOPS, type LatLng } from "../../../src/data/self-guided/left-bank-ww2.ts";
import { leaderLine, placeCard, type Box } from "../../../src/components/self-guided/routeLayout.ts";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { manifestPath, type Manifest } from "../lib/manifest.ts";
import { photoOutputPath } from "../lib/photos.ts";
import { PATHS, type Lang } from "../lib/sections.ts";

const PAPER = "#F7F3EC", RED = "#8B0000", INK = "#6B5A4E", GHOST = "#B9A892", DARK = "#1C1714";
const mercX = (lon: number) => (lon + 180) / 360;
const mercY = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

(async () => {
  const args = parseArgs();
  const lang = (args.get("lang") ?? "fr") as Lang;
  const sectionId = args.get("section") ?? "01-intro";
  const manifest = JSON.parse(readFileSync(manifestPath(lang), "utf8")) as Manifest;
  const section = manifest.sections.find((s) => s.id === sectionId);
  const cue = section?.media.find((m) => m.route);
  if (!cue?.route) throw new Error(`no route cue in ${sectionId}`);
  const at = Number(args.get("at") ?? Math.max(...cue.route.beats.map((b) => b.at)) + 4);

  const W = cue.w, H = cue.h;
  const { x0, x1, y0, y1 } = cue.route.proj;
  const px = ([lat, lon]: LatLng): [number, number] => [
    ((mercX(lon) - x0) / (x1 - x0)) * W,
    ((mercY(lat) - y0) / (y1 - y0)) * H,
  ];

  const medW = Math.round(W * 0.205);
  const medPhotoH = Math.round((medW - 12) / 1.3);
  const medH = medPhotoH + 12 + 34;
  const projectedRoute = ROUTE.map(px);
  const layout = { frame: { width: W, height: H }, card: { width: medW, height: medH }, route: projectedRoute };

  const ghost = ROUTE.map((p, i) => (i ? "L" : "M") + px(p).map((v) => v.toFixed(1)).join(" ")).join(" ");
  const shown = cue.route.beats.filter((b) => b.at <= at);
  const taken: Box[] = [];
  const frames: string[] = [];
  const tops: string[] = [];
  const images: sharp.OverlayOptions[] = [];

  for (const beat of shown) {
    const stop = STOPS.find((s) => s.sectionId === beat.stop)!;
    const main = stop.kind !== "inter";
    if (!beat.img || !main) continue; // only the persistent ones at the end
    const point = px(stop.pos);
    const box = placeCard(point, taken, layout);
    taken.push(box);
    const line = leaderLine(point, box);
    const label = stop.name[lang];
    const size = Math.min(16, Math.max(11, Math.floor((medW - 16) / (label.length * 0.52))));
    frames.push(`<line x1="${line.x1.toFixed(1)}" y1="${line.y1.toFixed(1)}" x2="${line.x2.toFixed(1)}" y2="${line.y2.toFixed(1)}" stroke="${RED}" stroke-width="2.5" opacity=".55"/>
      <rect x="${box.left + 1}" y="${box.top + 1}" width="${medW - 2}" height="${medH - 2}" rx="10" fill="${PAPER}" stroke="${RED}" stroke-width="3"/>
      `);
    tops.push(`<circle cx="${box.left + 27}" cy="${box.top + 27}" r="16" fill="${RED}" stroke="${PAPER}" stroke-width="3"/>
      <text x="${box.left + 27}" y="${box.top + 34}" text-anchor="middle" font-family="Georgia,serif" font-size="19" font-weight="bold" fill="${PAPER}">${stop.badge}</text>
      <text x="${box.left + medW / 2}" y="${box.top + medH - 12}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="${size}" font-weight="bold" fill="${RED}">${esc(label)}</text>`);
    const name = beat.img.split("/").pop()!.replace(/\.webp$/, "");
    images.push({
      input: await sharp(photoOutputPath(name), { pages: 1 }).resize(medW - 12, medPhotoH, { fit: "cover" }).toBuffer(),
      left: Math.round(box.left) + 6, top: Math.round(box.top) + 6,
    });
  }

  const dots = shown.map((b) => {
    const stop = STOPS.find((s) => s.sectionId === b.stop)!;
    const [x, y] = px(stop.pos);
    const main = stop.kind !== "inter";
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${main ? 15 : 8}" fill="${main ? RED : PAPER}" stroke="${main ? PAPER : DARK}" stroke-width="3"/>
      ${main ? `<text x="${x.toFixed(1)}" y="${(y + 7).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="19" font-weight="bold" fill="${PAPER}">${stop.badge}</text>` : ""}`;
  }).join("");

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="${ghost}" fill="none" stroke="${GHOST}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 12" opacity=".75"/>
    <path d="${ghost}" fill="none" stroke="${PAPER}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
    <path d="${ghost}" fill="none" stroke="${RED}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}${frames.join("")}
  </svg>`;
  const overlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${tops.join("")}
    <text x="${W - W * 0.02}" y="${H - 10}" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-size="14" fill="#9C8A7B">${cue.route.credit}</text>
  </svg>`;

  const base = photoOutputPath(cue.img.split("/").pop()!.replace(/\.webp$/, ""));
  const out = resolve(PATHS.outputDir, `route-map-${sectionId}.png`);
  await sharp(base).resize(W, H).composite([
    { input: Buffer.from(svg), top: 0, left: 0 },
    ...images,
    { input: Buffer.from(overlay), top: 0, left: 0 },
  ]).png().toFile(out);
  log.info("aperçu", `${out} — ${sectionId} à ${at.toFixed(1)} s, ${taken.length} médaillons`);
})();
