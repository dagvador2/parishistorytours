/**
 * The animated tour map: the route draws itself and a medallion opens at each
 * point — **timed on the narration**, not on a fixed rhythm.
 *
 *   pnpm tsx scripts/self-guided/tools/make-route-anim.ts [--fps 24] [--width 1040]
 *
 * Each place lights up at the moment Clément names it. The times come from
 * `output/manifest/<lang>.words.json`, so re-recording a take and regenerating
 * moves the animation with the voice; nothing is hand-timed.
 *
 * That is also why there is one file per cue: the intro walks through the whole
 * itinerary ("puis au croisement de la Rue Monsieur-le-Prince…") while stop 1
 * only lists the four main stops, on a different rhythm. One animation cannot
 * be in step with both.
 *
 * Each file lasts exactly as long as its cue stays on screen, so it never
 * restarts in the middle of a sentence.
 *
 * Output is ANIMATED WebP: an <img> plays it unaided, the service worker
 * precaches it like a photo, and the player needs no change. Written with
 * img2webp — ffmpeg's animated-WebP encoder drops frames and writes files its
 * own decoder cannot read back.
 */
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { ROUTE, STOPS, type LatLng, type Stop } from "../../../src/data/self-guided/left-bank-ww2.ts";
import { parseArgs } from "../lib/args.ts";
import { fmtBytes, log } from "../lib/log.ts";
import { manifestPath, wordsPath, type Manifest, type WordsSidecar } from "../lib/manifest.ts";
import { buildMapCanvas, PAPER } from "../lib/maptiles.ts";
import { photoSourcePath } from "../lib/photos.ts";
import { PATHS, type Lang } from "../lib/sections.ts";

const run = promisify(execFile);
const BLACK = "#1C1714", RED = "#8B0000", INK = "#6B5A4E", GHOST = "#B9A892";

/** The photo that opens at each point — the place, not the history. */
const MEDALLION: Record<string, string> = {
  "02-context-of-war": "n01_mur_saint_michel",
  "03-fall-of-paris": "n05_palais_luxembourg",
  "04-odeon": "n09_plaque_guierre",
  "05-resistance": "n27_rue_monsieur_le_prince",
  "06-sorbonne-facade": "g05_sorbonne_groupe",
  "07-observatory": "n11_observatoire",
  "08-saint-severin": "n49_saint_severin",
  "09-liberation": "n47_notre_dame",
};

/**
 * One file per cue. `find` is the phrase, in the narration of the hosting
 * section, at which that point should light up; `after` disambiguates a phrase
 * that occurs twice ("Luxembourg" is said of the garden before the palace).
 */
interface Beat {
  stop: string;
  find: string;
  offset?: number;
  /** false: light the dot and move on. For points named in a breath — "ensuite
   *  trois courts arrêts autour de la Sorbonne" — a medallion would flash. */
  medallion?: boolean;
}
interface Variant { name: string; section: string; /** the line under "Le parcours" */ sub: string; beats: Beat[] }

const VARIANTS: Variant[] = [
  {
    // "On va commencer au 60 Boulevard Saint-Michel… Ensuite nous traverserons
    // le Jardin du Luxembourg pour arriver au Palais du Luxembourg…"
    name: "anim_carte_tour",
    section: "01-intro",
    sub: "Quatre arrêts principaux, quatre interstops — 2 km, environ 1 h 30",
    beats: [
      { stop: "02-context-of-war", find: "on va commencer au" },
      { stop: "03-fall-of-paris", find: "pour arriver au palais du luxembourg" },
      { stop: "04-odeon", find: "nous irons au théâtre de l'odéon" },
      { stop: "05-resistance", find: "au croisement de la rue monsieur" },
      { stop: "06-sorbonne-facade", find: "ensuite trois courts arrêts", medallion: false },
      { stop: "07-observatory", find: "ensuite trois courts arrêts", offset: 0.7, medallion: false },
      { stop: "08-saint-severin", find: "ensuite trois courts arrêts", offset: 1.4, medallion: false },
      { stop: "09-liberation", find: "pour enfin terminer à notre" },
    ],
  },
  {
    // Stop 1 only lists the four main stops: "Ce premier arrêt ici… Le prochain
    // arrêt couvrira la chute de Paris… Agnès Humbert… terminera à Notre-Dame."
    name: "anim_carte_tour_stop1",
    section: "02-context-of-war",
    // Stop 1 names only the four main stops, and only those light up here.
    sub: "Quatre arrêts principaux, trois arrondissements — 2 km",
    beats: [
      { stop: "02-context-of-war", find: "ce premier arrêt ici" },
      { stop: "03-fall-of-paris", find: "couvrira la chute de paris" },
      { stop: "05-resistance", find: "du premier réseau de résistance" },
      { stop: "09-liberation", find: "on terminera à notre" },
    ],
  },
];

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** Overshoot a little on the way open, so the medallion pops rather than grows. */
const pop = (t: number) => (t >= 1 ? 1 : ease(t) * (1 + 0.12 * (1 - t)));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

/** Start time of `phrase` in a section's word stream, searching from `from` s. */
function timeOfPhrase(words: WordsSidecar["sections"][string], phrase: string, from: number): number {
  const needle = norm(phrase);
  for (let i = 0; i < words.length; i++) {
    if (words[i]!.start < from) continue;
    let acc = "";
    for (let j = i; j < words.length && acc.length < needle.length; j++) acc += norm(words[j]!.text);
    if (acc.startsWith(needle)) return words[i]!.start;
  }
  throw new Error(`phrase not found after ${from}s: "${phrase}"`);
}

/** Index in ROUTE of the point closest to `pos`, searching forward only. */
function routeIndexOf(pos: LatLng, from: number): number {
  let best = from, bestD = Infinity;
  for (let i = from; i < ROUTE.length; i++) {
    const d = (ROUTE[i]![0] - pos[0]) ** 2 + (ROUTE[i]![1] - pos[1]) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function pathUpTo(upTo: number, px: (p: LatLng) => [number, number]): string {
  const full = Math.floor(upTo);
  const out: [number, number][] = [];
  for (let i = 0; i <= Math.min(full, ROUTE.length - 1); i++) out.push(px(ROUTE[i]!));
  if (full < ROUTE.length - 1) {
    const t = upTo - full;
    const [ax, ay] = px(ROUTE[full]!), [bx, by] = px(ROUTE[full + 1]!);
    out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
  }
  if (out.length < 2) return "";
  return out.map((q, i) => (i ? "L" : "M") + q.map((v) => v.toFixed(1)).join(" ")).join(" ");
}

async function medallionPng(stop: Stop, photo: string, w: number): Promise<Buffer> {
  const pad = 6, cap = 34;
  const ph = Math.round((w - pad * 2) / 1.3);
  const h = ph + pad * 2 + cap;
  const img = await sharp(photoSourcePath(photo), { pages: 1 }).resize(w - pad * 2, ph, { fit: "cover" }).toBuffer();
  const main = stop.kind !== "inter";
  // "Rue Monsieur-le-Prince × Vaugirard" is far wider than the card. SVG's
  // textLength is ignored by the renderer sharp uses, so the type is stepped
  // down instead, and only truncated when even the smallest size overflows.
  const room = w - 16;
  const WIDTH_PER_CHAR = 0.52;
  let label = stop.name.fr;
  let size = Math.min(16, Math.floor(room / (label.length * WIDTH_PER_CHAR)));
  if (size < 11) {
    size = 11;
    const max = Math.floor(room / (size * WIDTH_PER_CHAR));
    if (label.length > max) label = `${label.slice(0, max - 1).trimEnd()}…`;
  }
  const frame = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
       <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="${PAPER}" stroke="${main ? RED : "#C9BCA8"}" stroke-width="${main ? 3 : 2}"/>
       <text x="${w / 2}" y="${h - 12}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
             font-size="${size}" font-weight="${main ? "bold" : "normal"}" fill="${main ? RED : INK}">${esc(label)}</text>
     </svg>`);
  const badge = main
    ? Buffer.from(`<svg width="34" height="34" xmlns="http://www.w3.org/2000/svg">
         <circle cx="17" cy="17" r="16" fill="${RED}" stroke="${PAPER}" stroke-width="2"/>
         <text x="17" y="24" text-anchor="middle" font-family="Georgia,serif" font-size="18" font-weight="bold" fill="${PAPER}">${stop.badge}</text>
       </svg>`)
    : undefined;
  return sharp(frame).composite([
    { input: img, left: pad, top: pad },
    ...(badge ? [{ input: badge, left: pad + 4, top: pad + 4 }] : []),
  ]).png().toBuffer();
}

async function main() {
  const args = parseArgs();
  const lang = (args.get("lang") ?? "fr") as Lang;
  const fps = Number(args.get("fps") ?? 24);
  const width = Number(args.get("width") ?? 1040);
  const quality = Number(args.get("quality") ?? 58);

  const manifest = JSON.parse(readFileSync(manifestPath(lang), "utf8")) as Manifest;
  const sidecar = JSON.parse(readFileSync(wordsPath(lang), "utf8")) as WordsSidecar;

  const canvas = await buildMapCanvas({ points: ROUTE, zoom: Number(args.get("zoom") ?? 16), width, wash: 0.92 });
  const { width: W, height: H, px } = canvas;
  const SAFE = Math.round(W * 0.055);
  const MED_W = Math.round(W * 0.235);

  // The whole walk, pale, from the first frame: the map has to mean something
  // while the narration is still saying "four main stops, two kilometres".
  const ghost = ROUTE.map((p, i) => (i ? "L" : "M") + px(p).map((v) => v.toFixed(1)).join(" ")).join(" ");
  const ghostDots = STOPS.filter((s) => s.kind !== "intro").map((s) => {
    const [x, y] = px(s.pos);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.kind === "inter" ? 7 : 12}" fill="none" stroke="${GHOST}" stroke-width="3"/>`;
  }).join("");

  for (const v of VARIANTS) {
    const section = manifest.sections.find((s) => s.id === v.section);
    if (!section) throw new Error(`section ${v.section} missing from the manifest`);
    const cue = section.media.find((m) => m.img.endsWith(`/${v.name}.webp`))
      ?? section.media.find((m) => m.img.includes("anim_carte_tour"));
    if (!cue) throw new Error(`no map cue in ${v.section} — add it to rebuild-cues.ts first`);
    const after = section.media.filter((m) => m.t > cue.t).map((m) => m.t);
    const onScreen = (after.length ? Math.min(...after) : section.durationSec) - cue.t;

    const words = sidecar.sections[v.section] ?? [];
    // The cursor only moves on to a new phrase: three interstops share one
    // sentence ("ensuite trois courts arrêts autour de la Sorbonne") and are
    // spread across it with `offset`.
    let search = cue.t;
    let lastFind = "";
    let lastAt = cue.t;
    const beats = v.beats.map((b) => {
      if (b.find !== lastFind) {
        lastAt = timeOfPhrase(words, b.find, search);
        search = lastAt + 0.01;
        lastFind = b.find;
      }
      const stop = STOPS.find((s) => s.sectionId === b.stop)!;
      return { stop, at: Math.max(0, lastAt + (b.offset ?? 0) - cue.t), photo: MEDALLION[b.stop]!, medallion: b.medallion !== false };
    }).sort((a, b) => a.at - b.at);

    let cursor = 0;
    const marks = beats.map((b) => {
      const idx = routeIndexOf(b.stop.pos, cursor);
      cursor = idx;
      return { ...b, idx };
    });

    // The line arrives exactly as the place is named; the medallion opens there
    // and stays until the line has to leave for the next one.
    const TRAVEL = 1.1, OPEN = 0.3, CLOSE = 0.3, MAX_HOLD = 3.2;
    const timed = marks.map((m, i) => {
      const prev = marks[i - 1];
      const startTravel = Math.max(prev ? prev.at + (prev.medallion ? OPEN + 0.2 : 0.05) : 0, m.at - TRAVEL);
      const next = marks[i + 1];
      const mustClose = next ? Math.max(m.at + OPEN + 0.2, next.at - TRAVEL - CLOSE) : m.at + MAX_HOLD;
      const startClose = m.medallion ? Math.min(m.at + OPEN + MAX_HOLD, mustClose) : m.at;
      return { ...m, startTravel, startOpen: m.at, startClose, endsAt: startClose + CLOSE };
    });
    log.step(`${v.name}: ${W}x${H}, ${onScreen.toFixed(1)} s à l'écran, ${timed.length} médaillons`);
    for (const t of timed) log.info("beat", `${t.stop.sectionId.padEnd(20)} ${t.at.toFixed(1)} s`);

    const medallions = await Promise.all(timed.map((m) => medallionPng(m.stop, m.photo, MED_W)));
    const MED_H = (await sharp(medallions[0]!).metadata()).height!;

    const frames = Math.round(onScreen * fps);
    const dir = mkdtempSync(join(tmpdir(), "phtroute-"));
    try {
      const files: string[] = [];
      let lastSig = "";
      let lastFile = "";
      for (let f = 0; f < frames; f++) {
        const t = f / fps;

        let drawnTo = 0;
        for (const s of timed) {
          if (t <= s.startTravel) break;
          const prevIdx = timed[timed.indexOf(s) - 1]?.idx ?? 0;
          drawnTo = prevIdx + (s.idx - prevIdx) * ease(Math.min(1, (t - s.startTravel) / Math.max(0.2, s.startOpen - s.startTravel)));
        }
        const open = timed.find((s) => s.medallion && t >= s.startOpen && t < s.endsAt);
        const scale = !open ? 0
          : t < open.startOpen + OPEN ? pop((t - open.startOpen) / OPEN)
          : t < open.startClose ? 1
          : 1 - ease((t - open.startClose) / CLOSE);

        // Nothing moved? Hand img2webp the same file again: it merges identical
        // frames into one long one, and we skip the render entirely.
        const sig = `${drawnTo.toFixed(2)}|${open?.stop.sectionId ?? ""}|${scale.toFixed(2)}|${timed.filter((s) => t >= s.startOpen).length}`;
        if (sig === lastSig && lastFile) { files.push(lastFile); continue; }
        lastSig = sig;

        const dots = timed.filter((s) => t >= s.startOpen).map((s) => {
          const [x, y] = px(s.stop.pos);
          const main = s.stop.kind !== "inter";
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${main ? 15 : 8}" fill="${main ? RED : PAPER}" stroke="${main ? PAPER : BLACK}" stroke-width="3"/>
            ${main ? `<text x="${x.toFixed(1)}" y="${(y + 7).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="19" font-weight="bold" fill="${PAPER}">${s.stop.badge}</text>` : ""}`;
        }).join("");

        const d = pathUpTo(drawnTo, px);
        const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
          <path d="${ghost}" fill="none" stroke="${GHOST}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 12" opacity=".75"/>
          ${ghostDots}
          ${d ? `<path d="${d}" fill="none" stroke="${PAPER}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
          <path d="${d}" fill="none" stroke="${RED}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
          ${dots}
          <rect x="0" y="0" width="${W}" height="104" fill="${PAPER}" opacity=".95"/>
          <text x="${SAFE}" y="52" font-family="Georgia,serif" font-size="32" font-weight="bold" fill="${RED}">Le parcours</text>
          <text x="${SAFE}" y="84" font-family="Helvetica,Arial,sans-serif" font-size="21" fill="${INK}">${esc(v.sub)}</text>
          <text x="${W - SAFE}" y="${H - 12}" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-size="14" fill="#9C8A7B">${canvas.credit}</text>
        </svg>`;

        const layers: sharp.OverlayOptions[] = [{ input: Buffer.from(svg), top: 0, left: 0 }];
        if (open && scale > 0.02) {
          const w = Math.max(2, Math.round(MED_W * scale));
          const h = Math.max(2, Math.round(MED_H * scale));
          const [sx, sy] = px(open.stop.pos);
          let left = sx < W / 2 ? sx + 26 : sx - w - 26;
          let top = sy < H / 2 ? sy + 22 : sy - h - 22;
          left = Math.max(SAFE, Math.min(W - w - SAFE, left));
          top = Math.max(112, Math.min(H - h - 30, top));
          layers.push({
            input: await sharp(medallions[timed.indexOf(open)]!).resize(w, h).ensureAlpha(Math.min(1, scale * 1.4)).png().toBuffer(),
            left: Math.round(left), top: Math.round(top),
          });
        }

        lastFile = join(dir, `f${String(f).padStart(4, "0")}.png`);
        await sharp(canvas.png).composite(layers).png().toFile(lastFile);
        files.push(lastFile);
      }

      const rendered = new Set(files).size;
      const out = resolve(PATHS.handoffDir, "photos", `${v.name}.webp`);
      await run("img2webp", ["-loop", "0", "-d", String(Math.round(1000 / fps)), "-lossy", "-q", String(quality), "-m", "6", ...files, "-o", out],
        { maxBuffer: 1024 * 1024 * 64 });
      const m = await sharp(out).metadata();
      log.info("anim", `${v.name} — ${m.width}x${m.height}, ${frames} images (${rendered} rendues, ${m.pages} stockées), ${onScreen.toFixed(1)} s, ${fmtBytes(statSync(out).size)}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}

main().catch((e) => { log.error("fatal", e instanceof Error ? e.stack ?? e.message : String(e)); process.exit(1); });
