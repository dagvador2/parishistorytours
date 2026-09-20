/**
 * Where the route map's medallions sit.
 *
 * The four main stops keep their medallion once opened, so the map ends on the
 * whole walk with its four photos. Two things make that hard: three of those
 * stops are bunched in the lower-left of the frame, and the card must not sit
 * on the line it is illustrating.
 *
 * So every candidate position is scored — cards already placed are a veto, the
 * route underneath is a heavy penalty, distance from the dot a light one — and
 * the best is kept. A leader line ties the card back to its point.
 *
 * Shared with `tools/preview-route-map.ts`, which renders the final frame so
 * the packing can be checked without walking through the audio.
 */
export interface Box { left: number; top: number; width: number; height: number }

/** Area the two boxes share, counting `pad` as part of each. */
function overlapArea(a: Box, b: Box, pad: number): number {
  const w = Math.min(a.left + a.width + pad, b.left + b.width + pad) - Math.max(a.left - pad, b.left - pad);
  const h = Math.min(a.top + a.height + pad, b.top + b.height + pad) - Math.max(a.top - pad, b.top - pad);
  return w > 0 && h > 0 ? w * h : 0;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const inside = (box: Box, x: number, y: number, pad: number) =>
  x >= box.left - pad && x <= box.left + box.width + pad &&
  y >= box.top - pad && y <= box.top + box.height + pad;

export interface LayoutOptions {
  frame: { width: number; height: number };
  card: { width: number; height: number };
  /** the walk, already projected to frame pixels: a card should not cover it */
  route?: [number, number][];
  /** gap kept between two cards, and between a card and the frame edge */
  pad?: number;
}

/**
 * Place one card near `point`, avoiding `taken` and — as far as possible — the
 * route itself. Candidates fan out around the dot; the cheapest wins.
 */
/**
 * The route sampled every few pixels. Testing only its vertices would let a
 * long straight leg pass clean through a card without a single point inside.
 */
function densify(route: [number, number][], step = 10): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, ay] = route[i]!;
    const [bx, by] = route[i + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  if (route.length) out.push(route[route.length - 1]!);
  return out;
}

export function placeCard(point: [number, number], taken: Box[], opts: LayoutOptions): Box {
  const { frame, card } = opts;
  const route = densify(opts.route ?? []);
  const pad = opts.pad ?? 10;
  const [sx, sy] = point;
  const margin = Math.round(frame.width * 0.045);
  const bottomMargin = Math.round(frame.height * 0.05); // the credit line lives there

  // Candidates fan out around the dot, near first then further, on both axes.
  // Four stops can sit almost on the same spot, so the net has to be wide.
  const near = 26;
  const candidates: [number, number][] = [];
  const dxs = [near, -card.width - near, near + 150, -card.width - near - 150, near + 340, -card.width - near - 340, -card.width / 2];
  const dys = [-card.height / 2, 22, -card.height - 22, 22 + 130, -card.height - 22 - 130, 22 + 320, -card.height - 22 - 320];
  for (const dx of dxs) for (const dy of dys) candidates.push([sx + dx, sy + dy]);

  // Everything is a cost, nothing is a hard veto: with enough cards in a small
  // frame there may be no free spot at all, and a slightly overlapping card is
  // still better than one shoved off screen.
  let best: Box | undefined;
  let bestScore = Infinity;
  for (const [i, [cx, cy]] of candidates.entries()) {
    const box: Box = {
      left: clamp(cx, margin, frame.width - card.width - margin),
      top: clamp(cy, margin, frame.height - card.height - bottomMargin),
      width: card.width,
      height: card.height,
    };
    const stacked = taken.reduce((n, b) => n + overlapArea(box, b, pad), 0);
    // how much of the walk this card would hide, and how far it strays
    const covered = route.reduce((n, [x, y]) => n + (inside(box, x, y, 6) ? 1 : 0), 0);
    const strayed = Math.hypot(box.left + card.width / 2 - sx, box.top + card.height / 2 - sy);
    const score = stacked * 0.5 + covered * 120 + strayed + i * 4;
    if (score < bestScore) { bestScore = score; best = box; }
  }
  return best!;
}

/** Shortest segment from the dot to the card, for the leader line. */
export function leaderLine(point: [number, number], box: Box): { x1: number; y1: number; x2: number; y2: number } {
  const [x, y] = point;
  const cx = clamp(x, box.left, box.left + box.width);
  const cy = clamp(y, box.top, box.top + box.height);
  return { x1: x, y1: y, x2: cx, y2: cy };
}
