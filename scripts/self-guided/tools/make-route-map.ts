/**
 * The tour map shown at the intro and at the first stop (`n03_carte_tour`).
 *
 *   pnpm tsx scripts/self-guided/tools/make-route-map.ts [--zoom 16] [--wash .92]
 *                                                       [--style osm] [--name n03_carte_tour]
 *
 * Reads `STOPS` and `ROUTE` straight from src/data/self-guided/left-bank-ww2.ts —
 * the same data the webapp navigates with — so the drawn map can never drift
 * from the one under the visitor's thumb. Edit the route there, re-run this,
 * and the photo follows.
 *
 * The animated version (`make-route-anim.ts`) draws on the identical frame.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { ROUTE, STOPS } from "../../../src/data/self-guided/left-bank-ww2.ts";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { buildMapCanvas, PAPER } from "../lib/maptiles.ts";
import { PATHS } from "../lib/sections.ts";

const BLACK = "#1C1714", RED = "#8B0000";

(async () => {
  const args = parseArgs();
  const outName = args.get("name") ?? "n03_carte_tour";
  const canvas = await buildMapCanvas({
    points: ROUTE,
    zoom: Number(args.get("zoom") ?? 16),
    wash: Number(args.get("wash") ?? 0.92),
    style: args.get("style") ?? "osm",
    width: 1200,
  });
  const { width: W, height: H, px } = canvas;
  log.step(`carte ${W}x${H} (rapport ${(W / H).toFixed(2)}:1, zoom ${canvas.zoom})`);

  const d = ROUTE.map((p, i) => (i ? "L" : "M") + px(p).map((v) => v.toFixed(1)).join(" ")).join(" ");
  const markers = STOPS.map((s) => {
    const [x, y] = px(s.pos);
    const main = s.kind !== "inter";
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${main ? 17 : 9}" fill="${main ? RED : PAPER}" stroke="${main ? PAPER : BLACK}" stroke-width="3"/>
      ${main ? `<text x="${x.toFixed(1)}" y="${(y + 8).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="21" font-weight="bold" fill="${PAPER}">${s.badge}</text>` : ""}`;
  }).join("");

  // `object-fit: cover` shaves a few per cent off one axis, and how much depends
  // on the handset. Nothing that must be read goes near an edge.
  const SAFE = Math.round(W * 0.055);
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="${d}" fill="none" stroke="${PAPER}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
    <path d="${d}" fill="none" stroke="${RED}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    ${markers}
    <rect x="0" y="0" width="${W}" height="118" fill="${PAPER}" opacity=".95"/>
    <text x="${SAFE}" y="58" font-family="Georgia,serif" font-size="34" font-weight="bold" fill="${RED}">Le parcours</text>
    <text x="${SAFE}" y="94" font-family="Helvetica,Arial,sans-serif" font-size="23" fill="#6B5A4E">Quatre arrêts principaux, quatre interstops — 2 km, environ 1 h 30</text>
    <text x="${W - SAFE}" y="${H - 14}" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-size="15" fill="#9C8A7B">${canvas.credit}</text>
  </svg>`;

  const out = resolve(PATHS.handoffDir, "photos", `${outName}.png`);
  const buf = await sharp(canvas.png).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
  writeFileSync(out, buf);
  log.info("carte", `${outName} — ${W}x${H}, ${(buf.length / 1024).toFixed(0)} KB, ${STOPS.length} arrêts`);
})();
