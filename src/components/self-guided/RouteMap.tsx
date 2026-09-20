/**
 * The tour map, drawn and animated by the player rather than pre-rendered.
 *
 * A baked animation (GIF/animated WebP) runs on its own clock: it keeps going
 * when the audio is paused, ignores a seek, and restarts wherever it happens to
 * be. So the walk is drawn here instead, from the app's own ROUTE/STOPS, and
 * advanced by `t` — the position of the audio. Pause and it freezes; scrub and
 * it follows.
 *
 * `route.proj` gives the Web Mercator bounds of the basemap photo, so the two
 * cannot fall out of register: the same projection produced the image.
 *
 * The four main stops keep their medallion once opened, so the map ends on the
 * whole walk with its four photos; the short stops still pop and fold away.
 *
 * The audio clock and the projection are shared with the May 1940 map, in
 * `liveMap.ts`: `t` is carried forward between the audio's sparse ticks so the
 * line runs at sixty frames rather than four, and stops once the last medallion
 * has closed.
 */
import { ROUTE, STOPS, type Lang, type LatLng } from "../../data/self-guided/left-bank-ww2";
import type { ManifestMedia, ManifestRoute } from "../../lib/self-guided/types";
import { ease, mercX, mercY, pop, useSmoothTime } from "./liveMap";
import { leaderLine, placeCard, type Box } from "./routeLayout";

/** How long a medallion takes to pop open, and to fold away. */
const OPEN = 0.3;
const CLOSE = 0.3;
/** How long the line takes to reach a point, and the longest a medallion stays. */
const TRAVEL = 1.1;
const MAX_HOLD = 3.2;

interface Placed { beat: ManifestRoute["beats"][number]; idx: number; label: string; main: boolean; pos: LatLng }

/** Index in ROUTE of the point nearest `pos`, never going backwards. */
function routeIndexOf(pos: LatLng, from: number): number {
  let best = from;
  let bestD = Infinity;
  for (let i = from; i < ROUTE.length; i++) {
    const d = (ROUTE[i][0] - pos[0]) ** 2 + (ROUTE[i][1] - pos[1]) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

export default function RouteMap({ media, t: audioT, playing, lang }: { media: ManifestMedia & { key: string }; t: number; playing: boolean; lang: Lang }) {
  const route = media.route!;
  const W = media.w;
  const H = media.h;
  const { x0, x1, y0, y1 } = route.proj;
  const px = ([lat, lon]: LatLng): [number, number] => [
    ((mercX(lon) - x0) / (x1 - x0)) * W,
    ((mercY(lat) - y0) / (y1 - y0)) * H,
  ];

  let cursor = 0;
  const placed: Placed[] = [];
  for (const beat of route.beats) {
    const stop = STOPS.find((s) => s.sectionId === beat.stop);
    if (!stop) continue;
    const idx = routeIndexOf(stop.pos, cursor);
    cursor = idx;
    placed.push({ beat, idx, label: stop.name[lang], main: stop.kind !== "inter", pos: stop.pos });
  }

  const timed = placed.map((p, i) => {
    const prev = placed[i - 1];
    const next = placed[i + 1];
    const hasMedallion = Boolean(p.beat.img);
    const startTravel = Math.max(prev ? prev.beat.at + (prev.beat.img ? OPEN + 0.2 : 0.05) : 0, p.beat.at - TRAVEL);
    const mustClose = next ? Math.max(p.beat.at + OPEN + 0.2, next.beat.at - TRAVEL - CLOSE) : p.beat.at + MAX_HOLD;
    const startClose = hasMedallion ? Math.min(p.beat.at + OPEN + MAX_HOLD, mustClose) : p.beat.at;
    return { ...p, startTravel, startOpen: p.beat.at, startClose, endsAt: startClose + CLOSE };
  });

  const endsAt = timed.length ? Math.max(...timed.map((s) => s.endsAt)) : 0;
  const t = useSmoothTime(audioT, playing, endsAt);

  // how far along ROUTE the red line has been drawn
  let drawnTo = 0;
  for (const s of timed) {
    if (t <= s.startTravel) break;
    const prevIdx = timed[timed.indexOf(s) - 1]?.idx ?? 0;
    drawnTo = prevIdx + (s.idx - prevIdx) * ease(Math.min(1, (t - s.startTravel) / Math.max(0.2, s.startOpen - s.startTravel)));
  }

  const dTo = (upTo: number) => {
    const full = Math.floor(upTo);
    const out: [number, number][] = [];
    for (let i = 0; i <= Math.min(full, ROUTE.length - 1); i++) out.push(px(ROUTE[i]));
    if (full < ROUTE.length - 1) {
      const f = upTo - full;
      const [ax, ay] = px(ROUTE[full]);
      const [bx, by] = px(ROUTE[full + 1]);
      out.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
    }
    if (out.length < 2) return "";
    return out.map((q, i) => (i ? "L" : "M") + q.map((v) => v.toFixed(1)).join(" ")).join(" ");
  };

  const ghost = ROUTE.map((p, i) => (i ? "L" : "M") + px(p).map((v) => v.toFixed(1)).join(" ")).join(" ");
  const drawn = dTo(drawnTo);

  // A main stop keeps its medallion for good; a short stop's folds away again.
  const medW = Math.round(W * 0.205);
  const medPhotoH = Math.round((medW - 12) / 1.3);
  const medH = medPhotoH + 12 + 34;
  const projectedRoute = ROUTE.map(px);
  const layout = { frame: { width: W, height: H }, card: { width: medW, height: medH }, route: projectedRoute };

  const taken: Box[] = [];
  const cards = timed
    .filter((s) => s.beat.img && t >= s.startOpen && (s.main || t < s.endsAt))
    .map((s) => {
      const point = px(s.pos);
      const box = placeCard(point, taken, layout);
      taken.push(box);
      const scale = t < s.startOpen + OPEN ? pop((t - s.startOpen) / OPEN)
        : s.main || t < s.startClose ? 1
        : 1 - ease((t - s.startClose) / CLOSE);
      return { s, box, point, scale, line: leaderLine(point, box) };
    })
    .filter((c) => c.scale > 0.02);

  return (
    <div className="ag-livemap">
      <img src={media.img} alt="" className="ag-well__img" decoding="async" />
      {/* `slice` is object-fit: cover, so the overlay is cropped exactly like the photo */}
      <svg className="ag-livemap__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d={ghost} className="ag-routemap__ghost" />
        {timed.map((s) => {
          const [x, y] = px(s.pos);
          return <circle key={`g${s.beat.stop}`} cx={x} cy={y} r={s.main ? 12 : 7} className="ag-routemap__ghostdot" />;
        })}
        {drawn && <path d={drawn} className="ag-routemap__halo" />}
        {drawn && <path d={drawn} className="ag-routemap__line" />}
        {timed.filter((s) => t >= s.startOpen).map((s) => {
          const [x, y] = px(s.pos);
          return (
            <g key={s.beat.stop}>
              <circle cx={x} cy={y} r={s.main ? 15 : 8} className={s.main ? "ag-routemap__dot" : "ag-routemap__dot--inter"} />
              {s.main && <text x={x} y={y + 7} className="ag-routemap__badge">{STOPS.find((p) => p.sectionId === s.beat.stop)?.badge}</text>}
            </g>
          );
        })}
        {cards.map(({ s, box, scale, line }) => (
          <g key={s.beat.stop}>
            {scale > 0.9 && <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className="ag-routemap__leader" />}
            <g transform={`translate(${box.left + medW / 2} ${box.top + medH / 2}) scale(${scale}) translate(${-medW / 2} ${-medH / 2})`} opacity={Math.min(1, scale * 1.4)}>
              <rect x="1" y="1" width={medW - 2} height={medH - 2} rx="10" className={s.main ? "ag-routemap__card" : "ag-routemap__card--inter"} />
              <image href={s.beat.img} x="6" y="6" width={medW - 12} height={medPhotoH} preserveAspectRatio="xMidYMid slice" />
              <text x={medW / 2} y={medH - 12} className={s.main ? "ag-routemap__label" : "ag-routemap__label--inter"}
                textLength={s.label.length * 8.4 > medW - 16 ? medW - 16 : undefined} lengthAdjust="spacingAndGlyphs">
                {s.label}
              </text>
              {s.main && (
                <>
                  <circle cx="27" cy="27" r="16" className="ag-routemap__dot" />
                  <text x="27" y="34" className="ag-routemap__badge">{STOPS.find((p) => p.sectionId === s.beat.stop)?.badge}</text>
                </>
              )}
            </g>
          </g>
        ))}
        <text x={W - W * 0.02} y={H - 10} className="ag-routemap__credit">{route.credit}</text>
      </svg>
    </div>
  );
}
