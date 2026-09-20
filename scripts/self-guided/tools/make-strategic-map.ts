/**
 * The strategic picture of August 1944, for the last stop: the Allies land in
 * Normandy, the objective is Berlin — and Paris sits on the road between the
 * two. The narration states exactly that, and had no image for it.
 *
 *   pnpm tsx scripts/self-guided/tools/make-strategic-map.ts
 *
 * Same recipe as make-map-animation.ts (OpenStreetMap tiles, real coordinates,
 * attribution burnt in) but a single still: nothing moves in the narration
 * here, it is one idea held for a few seconds.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { log } from "../lib/log.ts";
import { PATHS } from "../lib/sections.ts";

const Z = 5, TS_PX = 256, WIDTH = 1200;
/**
 * Framed so the rendered ratio lands near the player's well (~1.3:1): wider
 * latitude than the route needs, because `object-fit: cover` crops the sides
 * and Normandy and Berlin sit on them.
 */
const AREA = { lonMin: -3.6, lonMax: 16.4, latMin: 45.5, latMax: 55.2 };

const lon2x = (lon: number) => ((lon + 180) / 360) * 2 ** Z;
const lat2y = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** Z;
};

function get(url: string): Promise<Buffer> {
  return new Promise((res, rej) => {
    import("node:https").then(({ default: https }) => {
      https.get(url, { headers: { "User-Agent": "PHT-audioguide/1.0 (clemdaguetschott@gmail.com)" } }, (r) => {
        if (r.statusCode !== 200) { r.resume(); return rej(new Error(`${url} -> ${r.statusCode}`)); }
        const c: Buffer[] = [];
        r.on("data", (d) => c.push(d as Buffer));
        r.on("end", () => res(Buffer.concat(c)));
      }).on("error", rej);
    });
  });
}

type Pt = [number, number];
const BLACK = "#1C1714", RED = "#8B0000", GREEN = "#2F5D34";

const NORMANDIE: Pt = [49.34, -0.62];
const PARIS: Pt = [48.857, 2.352];
const BERLIN: Pt = [52.52, 13.40];
/** The advance as it actually ran: the beaches, the breakout, then east. */
const LEG_1: Pt[] = [[49.34, -0.62], [48.95, 0.35], [48.80, 1.45], [48.86, 2.25]];
const LEG_2: Pt[] = [[48.95, 2.6], [49.60, 5.2], [50.40, 8.4], [51.60, 11.2], [52.45, 13.05]];

(async () => {
  const x0 = Math.floor(lon2x(AREA.lonMin)), x1 = Math.floor(lon2x(AREA.lonMax));
  const y0 = Math.floor(lat2y(AREA.latMax)), y1 = Math.floor(lat2y(AREA.latMin));
  const tiles: sharp.OverlayOptions[] = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    tiles.push({ input: await get(`https://tile.openstreetmap.org/${Z}/${tx}/${ty}.png`), left: (tx - x0) * TS_PX, top: (ty - y0) * TS_PX });
    await new Promise((r) => setTimeout(r, 120));
  }
  const W = (x1 - x0 + 1) * TS_PX, H = (y1 - y0 + 1) * TS_PX;
  const mosaic = await sharp({ create: { width: W, height: H, channels: 3, background: "#F7F3EC" } }).composite(tiles).png().toBuffer();

  const cropL = Math.round((lon2x(AREA.lonMin) - x0) * TS_PX);
  const cropT = Math.round((lat2y(AREA.latMax) - y0) * TS_PX);
  const cw = Math.round((lon2x(AREA.lonMax) - lon2x(AREA.lonMin)) * TS_PX);
  const ch = Math.round((lat2y(AREA.latMin) - lat2y(AREA.latMax)) * TS_PX);
  const HEIGHT = Math.round((ch / cw) * WIDTH);
  log.step(`carte ${cw}x${ch} -> ${WIDTH}x${HEIGHT} (rapport ${(WIDTH / HEIGHT).toFixed(2)}:1)`);

  const canvas = await sharp(mosaic).extract({ left: cropL, top: cropT, width: cw, height: ch })
    .modulate({ saturation: 0.16, brightness: 1.08 }).tint("#E8DFCF").resize(WIDTH, HEIGHT).png().toBuffer();

  const k = WIDTH / cw;
  // Screen pixels throughout: putting the labels inside a scaled <g> multiplied
  // their type by k and pushed "NORMANDIE" and "BERLIN" off the frame.
  const px = ([lat, lon]: Pt): [number, number] => [
    ((lon2x(lon) - x0) * TS_PX - cropL) * k,
    ((lat2y(lat) - y0) * TS_PX - cropT) * k,
  ];
  const path = (pts: Pt[]) => pts.map((q, i) => (i ? "L" : "M") + px(q).map((v) => v.toFixed(1)).join(" ")).join(" ");

  const dot = (p: Pt, label: string, colour: string, r: number, dx: number, dy: number, size: number) => {
    const [x, y] = px(p);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${colour}" stroke="#F7F3EC" stroke-width="3"/>
      <text x="${(x + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${dx < 0 ? "end" : "start"}"
        font-family="Helvetica,Arial,sans-serif" font-size="${size}" font-weight="bold" fill="${BLACK}"
        stroke="#F7F3EC" stroke-width="5" paint-order="stroke">${label}</text>`;
  };

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>${[GREEN].map((c) => `<marker id="m${c.slice(1)}" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="${c}"/></marker>`).join("")}</defs>
    <path d="${path(LEG_1)}" fill="none" stroke="#F7F3EC" stroke-width="16" stroke-linecap="round"/>
    <path d="${path(LEG_1)}" fill="none" stroke="${GREEN}" stroke-width="9" stroke-linecap="round" marker-end="url(#m${GREEN.slice(1)})"/>
    <path d="${path(LEG_2)}" fill="none" stroke="#F7F3EC" stroke-width="16" stroke-linecap="round"/>
    <path d="${path(LEG_2)}" fill="none" stroke="${GREEN}" stroke-width="9" stroke-linecap="round" stroke-dasharray="20 14" marker-end="url(#m${GREEN.slice(1)})"/>
    ${dot(NORMANDIE, "NORMANDIE", GREEN, 9, -14, 36, 28)}
    ${dot(PARIS, "PARIS", RED, 12, 18, 12, 36)}
    ${dot(BERLIN, "BERLIN", BLACK, 9, -14, 52, 28)}
    <text x="${(px(PARIS)[0] + 18).toFixed(1)}" y="${(px(PARIS)[1] + 42).toFixed(1)}" font-family="Georgia,serif" font-style="italic"
      font-size="24" fill="${RED}" stroke="#F7F3EC" stroke-width="5" paint-order="stroke">sur la route</text>
    <rect x="0" y="0" width="${WIDTH}" height="96" fill="#F7F3EC" opacity=".94"/>
    <text x="24" y="44" font-family="Georgia,serif" font-size="36" font-weight="bold" fill="${RED}">Juin – août 1944</text>
    <text x="24" y="78" font-family="Helvetica,Arial,sans-serif" font-size="24" fill="#6B5A4E">De la Normandie à Berlin — et Paris se trouve sur le chemin</text>
    <text x="${WIDTH - 12}" y="${HEIGHT - 10}" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-size="15" fill="#9C8A7B">Fond de carte © OpenStreetMap contributors</text>
  </svg>`;

  const out = resolve(PATHS.handoffDir, "photos", "n48_carte_normandie_berlin.png");
  const buf = await sharp(canvas).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
  writeFileSync(out, buf);
  log.info("carte", `n48_carte_normandie_berlin — ${WIDTH}x${HEIGHT}, ${(buf.length / 1024).toFixed(0)} KB`);
})();
