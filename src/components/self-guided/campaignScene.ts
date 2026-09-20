/**
 * A campaign map, as a list of shapes at one instant.
 *
 * Two maps are drawn by this one function — the German offensive of May 1940
 * and the Allied advance of 1944 — because they are the same drawing over
 * different geography: the `geo` argument says which (`campaign-map.ts`).
 *
 * The component turns these shapes into JSX and `tools/preview-campaign-map.ts`
 * turns the very same list into an SVG string, so the preview is the drawing —
 * not a second implementation of it that can quietly drift. That matters here:
 * the only way to check eighty seconds of animation is to render frames of it.
 *
 * Nothing in the frame ever restarts. An arrow draws once, at the second it is
 * spoken, and then stays for good, stepping back to `DIM` when the story moves
 * on. Cards pop open and fold away on their own beat; the banner cuts, it does
 * not cross-fade (a dip through the well's own background reads as a blink).
 */
import { INK, moveById, type CampaignGeography, type Move } from "../../data/self-guided/campaign-map";
import type { Lang } from "../../data/self-guided/left-bank-ww2";
import { OFFENSIVE_GEO } from "../../data/self-guided/offensive-1940";
import { ease, partialPath, pop, projector, type Proj } from "./liveMap";

// ------------------------------------------------------------------ shapes

export interface Common { op?: number }
export type Shape =
  | (Common & { k: "path"; d: string; stroke: string; w: number; dash?: string; marker?: string })
  | (Common & { k: "circle"; cx: number; cy: number; r: number; fill: string; stroke?: string; sw?: number })
  | (Common & { k: "rect"; x: number; y: number; w: number; h: number; rx: number; fill: string; stroke?: string; sw?: number })
  | (Common & { k: "text"; x: number; y: number; s: string; size: number; fill: string; serif?: boolean; bold?: boolean; italic?: boolean; anchor?: "start" | "middle" | "end"; halo?: string })
  | (Common & { k: "image"; href: string; x: number; y: number; w: number; h: number })
  | (Common & { k: "group"; transform?: string; items: Shape[] });

/** One arrowhead per ink, across both maps; both renderers emit the same `<defs>`. */
export const ARROW_INKS = [INK.black, INK.blue, INK.red, INK.green];
export const markerId = (colour: string) => `ag-arrow-${colour.slice(1)}`;

// ------------------------------------------------------------------ timing

/** How far back a finished arrow steps once a later phase has begun. */
const DIM = 0.42;
const DIM_OVER = 1.2;
/** Cards pop open and fold away in this long. */
const CARD = 0.34;
/** A dated pill takes this long to pop. */
const CHIP = 0.45;
/** A legend row takes this long to slide in. */
const ROW = 0.4;

// ------------------------------------------------------------------ layout

/**
 * The image is cropped like the photo it sits on (`object-fit: cover`), and the
 * player's well is taller than the map on every phone — roughly 0.95:1 against
 * the map's 1.3:1 — so up to a seventh of the width is lost on each side. Type
 * is kept inside what survives that; arrows may run out of frame, which reads
 * as an army arriving from off the map.
 */
const SAFE_X = 0.14;
const SAFE_Y = 0.06;

/** Rough advance width — enough to size a pill or shrink a caption to fit. */
const textW = (s: string, size: number, bold = false) => s.length * size * (bold ? 0.56 : 0.5);

export interface SceneOpts {
  W: number;
  H: number;
  proj: Proj;
  credit: string;
  lang: Lang;
  /** which map this is; defaults to the May 1940 offensive */
  geo?: CampaignGeography;
  /** beats resolved on the narration: `at` is seconds into the cue */
  beats: { move: string; at: number; img?: string }[];
  /** seconds into the cue */
  t: number;
}

interface Timed { move: Move; at: number; img?: string }

/** Last second at which anything in the frame is still moving. */
export function campaignEndsAt(beats: { move: string; at: number }[], geo: CampaignGeography = OFFENSIVE_GEO): number {
  let end = 0;
  for (const b of beats) {
    const m = moveById(geo, b.move);
    end = Math.max(end, b.at + (m?.draw ?? CARD) + DIM_OVER);
  }
  return end;
}

export function campaignScene(o: SceneOpts): Shape[] {
  const { W, H, lang, t } = o;
  const geo = o.geo ?? OFFENSIVE_GEO;
  const px = projector(o.proj, W, H);
  const u = W / 1400; // every size below is quoted in the frame the map was designed at
  const left = SAFE_X * W;
  const right = (1 - SAFE_X) * W;
  const bottom = (1 - SAFE_Y) * H;

  const timed: Timed[] = o.beats
    .flatMap((b) => {
      const move = moveById(geo, b.move);
      return move ? [{ move, at: b.at, ...(b.img ? { img: b.img } : {}) }] : [];
    })
    .sort((a, b) => a.at - b.at);
  const started = timed.filter((b) => t >= b.at);

  /** The highest phase reached, and when — everything below it steps back. */
  let phase = 0;
  let phaseAt = 0;
  for (const b of started) {
    if (b.move.phase > phase) { phase = b.move.phase; phaseAt = b.at; }
  }
  const dimmed = (m: Move) => (m.phase < phase ? 1 - (1 - DIM) * ease((t - phaseAt) / DIM_OVER) : 1);

  const back: Shape[] = [];   // arrows
  const front: Shape[] = [];  // towns, pills, cards, type

  // ---------------------------------------------------------------- arrows
  for (const b of started) {
    const m = b.move;
    if (!m.pts) continue;
    const p = ease((t - b.at) / (m.draw ?? 2.5));
    const d = partialPath(m.pts, p, px);
    if (!d) continue;
    const op = dimmed(m);
    // a paper casing under every arrow, so it reads over the map's own roads
    back.push({ k: "path", d, stroke: INK.paper, w: (m.width! + 7) * u, op: op * 0.85 });
    back.push({
      k: "path", d, stroke: m.colour!, w: m.width! * u, op,
      ...(m.dash ? { dash: `${13 * u} ${10 * u}` } : {}),
      marker: markerId(m.colour!),
    });
  }

  // ------------------------------------------------------------ the ground
  for (const label of geo.labels) {
    const [ax, ay] = px(label.pos);
    front.push({
      k: "text", x: ax, y: ay - 24 * u, s: label.text[lang], size: 27 * u,
      fill: "#4A3A2E", serif: true, italic: true, anchor: "middle", halo: INK.paper,
    });
  }
  for (const c of geo.cities) {
    const [x, y] = px(c.pos);
    front.push({ k: "circle", cx: x, cy: y, r: (c.main ? 10 : 5) * u, fill: c.main ? INK.red : INK.black, stroke: INK.paper, sw: 3 * u });
    front.push({
      k: "text", x: x + (c.dx ?? 0) * u, y: y + (c.dy ?? -12) * u, s: c.name,
      size: (c.main ? 34 : 26) * u, fill: INK.black, bold: true,
      anchor: c.dx ? "start" : "middle", halo: INK.paper,
    });
  }

  // ------------------------------------------------------------ dated pills
  for (const b of started) {
    const chip = b.move.chip;
    if (!chip) continue;
    const [x, y] = px(chip.pos);
    const s = pop((t - b.at) / CHIP);
    const size = 30 * u;
    const w = textW(chip.text, size, true) + 40 * u;
    const h = 48 * u;
    front.push({
      k: "group", op: Math.min(1, s * 1.4) * dimmed(b.move),
      transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)}) translate(${(-w / 2).toFixed(1)} ${(-h / 2).toFixed(1)})`,
      items: [
        { k: "rect", x: 0, y: 0, w, h, rx: h / 2, fill: INK.paper, stroke: chip.colour, sw: 2.5 * u },
        { k: "text", x: w / 2, y: h / 2 + size * 0.36, s: chip.text, size, fill: chip.colour, bold: true, anchor: "middle" },
      ],
    });
  }

  // -------------------------------------------------- portrait / quoted line
  // Both live in the same slot on the left, over the empty country west of the
  // advance; they never overlap in time, and each folds away when the narration
  // has moved past it.
  for (const b of started) {
    const m = b.move;
    if (!m.inset && !m.quote) continue;
    const closes = timed.find((x) => x.move.hides === m.id && t >= x.at);
    const s = closes ? 1 - ease((t - closes.at) / CARD) : pop((t - b.at) / CARD);
    if (s <= 0.02) continue;

    const items: Shape[] = [];
    let w = 0;
    let h = 0;
    if (m.inset && b.img) {
      const pad = 8 * u;
      w = 0.17 * W;
      const ph = (w - pad * 2) / 1.25;
      const cap = m.inset.caption[lang];
      const capSize = Math.min(23 * u, ((w - 20 * u) / Math.max(1, cap.length)) / 0.5);
      h = ph + pad * 2 + 38 * u;
      items.push({ k: "rect", x: 0, y: 0, w, h, rx: 10 * u, fill: INK.paper, stroke: INK.hairline, sw: 2.5 * u });
      items.push({ k: "image", href: b.img, x: pad, y: pad, w: w - pad * 2, h: ph });
      items.push({ k: "text", x: w / 2, y: h - 14 * u, s: cap, size: capSize, fill: INK.blue, bold: true, anchor: "middle" });
    } else if (m.quote) {
      const [head, foot] = m.quote.lines[lang];
      const hs = 36 * u;
      const fs = 24 * u;
      w = Math.max(textW(head!, hs, true), textW(foot!, fs)) + 44 * u;
      h = 116 * u;
      items.push({ k: "rect", x: 0, y: 0, w, h, rx: 10 * u, fill: INK.paper, stroke: INK.red, sw: 3 * u });
      items.push({ k: "text", x: w / 2, y: 50 * u, s: head!, size: hs, fill: INK.red, serif: true, bold: true, anchor: "middle" });
      items.push({ k: "text", x: w / 2, y: 88 * u, s: foot!, size: fs, fill: INK.muted, anchor: "middle" });
    }
    // Anchored on the left edge of the safe area, centred on the slot.
    const cx = m.quote ? left + w / 2 : left + w / 2;
    const cy = m.quote ? 0.52 * H : 0.51 * H;
    front.push({
      k: "group", op: Math.min(1, s * 1.4),
      transform: `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${s.toFixed(3)}) translate(${(-w / 2).toFixed(1)} ${(-h / 2).toFixed(1)})`,
      items,
    });
  }

  // ---------------------------------------------------------------- legend
  // Rows are laid out from the bottom up, so adding one never moves the ones
  // already read: the box grows upwards and the new line appears beneath.
  const rows = started.filter((b) => b.move.legend);
  if (rows.length) {
    const size = 26 * u;
    const rowH = 40 * u;
    const pad = 12 * u;
    const last = rows[rows.length - 1]!;
    const grown = rows.length - 1 + ease((t - last.at) / ROW);
    const boxW = Math.max(...rows.map((r) => textW(r.move.legend!.text[lang], size))) + 116 * u;
    const boxH = grown * rowH + pad * 2;
    const x = right - boxW;
    const yBottom = bottom;
    front.push({ k: "rect", x, y: yBottom - boxH, w: boxW, h: boxH, rx: 10 * u, fill: INK.paper, op: 0.94, stroke: "#E4DCD0", sw: 2 * u });
    rows.forEach((r, i) => {
      const leg = r.move.legend!;
      const cy = yBottom - pad - (rows.length - 1 - i) * rowH - rowH / 2;
      const op = (i === rows.length - 1 ? ease((t - r.at) / ROW) : 1) * (r.move.phase < phase ? 0.5 : 1);
      front.push({
        k: "group", op,
        items: [
          { k: "path", d: `M${(x + pad + 4 * u).toFixed(1)} ${cy.toFixed(1)} L${(x + pad + 52 * u).toFixed(1)} ${cy.toFixed(1)}`, stroke: leg.colour, w: 7 * u, ...(leg.dash ? { dash: `${10 * u} ${7 * u}` } : {}) },
          { k: "text", x: x + pad + 66 * u, y: cy + size * 0.36, s: leg.text[lang], size, fill: INK.black },
        ],
      });
    });
  }

  // ---------------------------------------------------------------- banner
  // Top left, over the sea: the only corner no arrow crosses. It cuts from one
  // phase to the next rather than fading, like the photos in the well.
  const banner = [...started].reverse().find((b) => b.move.banner)?.move.banner;
  if (banner) {
    const ts = 36 * u;
    const ss = 25 * u;
    const pad = 18 * u;
    const w = Math.max(textW(banner.title[lang], ts, true), textW(banner.sub[lang], ss)) + pad * 2;
    const h = ts + ss + pad * 2 + 8 * u;
    const y = SAFE_Y * H;
    front.push({ k: "rect", x: left, y, w, h, rx: 10 * u, fill: INK.paper, op: 0.94, stroke: "#E4DCD0", sw: 2 * u });
    front.push({ k: "text", x: left + pad, y: y + pad + ts * 0.8, s: banner.title[lang], size: ts, fill: INK.red, serif: true, bold: true });
    front.push({ k: "text", x: left + pad, y: y + pad + ts + 8 * u + ss * 0.8, s: banner.sub[lang], size: ss, fill: INK.muted });
  }

  // ---------------------------------------------------------------- credit
  front.push({ k: "text", x: left, y: bottom, s: o.credit, size: 22 * u, fill: INK.credit });

  return [...back, ...front];
}

// ---------------------------------------------------------------- SVG text

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Helvetica,Arial,sans-serif";
const n = (v: number) => (Math.round(v * 100) / 100).toString();

export function markerDefsSvg(): string {
  return `<defs>${ARROW_INKS.map((c) =>
    `<marker id="${markerId(c)}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.6" markerHeight="4.6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="${c}"/></marker>`).join("")}</defs>`;
}

/** The same shapes as SVG source, for the preview renderer. */
export function shapesToSvg(shapes: Shape[]): string {
  return shapes.map((s) => {
    const op = s.op !== undefined && s.op < 1 ? ` opacity="${n(s.op)}"` : "";
    switch (s.k) {
      case "path":
        return `<path d="${s.d}" fill="none" stroke="${s.stroke}" stroke-width="${n(s.w)}" stroke-linecap="round" stroke-linejoin="round"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}${s.marker ? ` marker-end="url(#${s.marker})"` : ""}${op}/>`;
      case "circle":
        return `<circle cx="${n(s.cx)}" cy="${n(s.cy)}" r="${n(s.r)}" fill="${s.fill}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${n(s.sw ?? 1)}"` : ""}${op}/>`;
      case "rect":
        return `<rect x="${n(s.x)}" y="${n(s.y)}" width="${n(s.w)}" height="${n(s.h)}" rx="${n(s.rx)}" fill="${s.fill}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${n(s.sw ?? 1)}"` : ""}${op}/>`;
      case "text":
        return `<text x="${n(s.x)}" y="${n(s.y)}" font-family="${s.serif ? SERIF : SANS}" font-size="${n(s.size)}"${s.bold ? ` font-weight="bold"` : ""}${s.italic ? ` font-style="italic"` : ""} fill="${s.fill}"${s.anchor ? ` text-anchor="${s.anchor}"` : ""}${s.halo ? ` stroke="${s.halo}" stroke-width="${n(s.size * 0.18)}" paint-order="stroke"` : ""}${op}>${esc(s.s)}</text>`;
      case "image":
        return `<image xlink:href="${esc(s.href)}" x="${n(s.x)}" y="${n(s.y)}" width="${n(s.w)}" height="${n(s.h)}" preserveAspectRatio="xMidYMid slice"/>`;
      case "group":
        return `<g${s.transform ? ` transform="${s.transform}"` : ""}${op}>${shapesToSvg(s.items)}</g>`;
    }
  }).join("");
}
