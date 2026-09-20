/**
 * What the live maps — the walk (`RouteMap`) and the campaign maps
 * (`CampaignMap`) — have in common: the audio clock and the projection.
 *
 * Both used to be pre-rendered animations, and both failed the same way: an
 * animated WebP runs on its own clock, so it kept going while the audio was
 * paused, ignored a seek, and — because the player preloads images and the
 * browser shares one animation timeline between elements pointing at the same
 * resource — was already half over by the time it appeared. Drawing them here,
 * from `t`, fixes all three at once and costs a few kilobytes instead of a
 * megabyte.
 */
import { useEffect, useRef, useState } from "react";
import type { LatLng } from "../../data/self-guided/left-bank-ww2";

/** Smoothstep, clamped. */
export const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** Overshoot slightly on the way open, so a card pops rather than grows. */
export const pop = (t: number) => (t >= 1 ? 1 : ease(t) * (1 + 0.12 * (1 - t)));

export const mercX = (lon: number) => (lon + 180) / 360;
export const mercY = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
};

/** Normalised Web Mercator bounds of a basemap image, as the pipeline publishes them. */
export interface Proj { x0: number; x1: number; y0: number; y1: number }

/**
 * lat/lng → pixel in a basemap of `W`x`H`. The bounds come from the image the
 * pipeline produced, so the overlay and the photo cannot fall out of register.
 */
export function projector(proj: Proj, W: number, H: number): (p: LatLng) => [number, number] {
  const { x0, x1, y0, y1 } = proj;
  return ([lat, lon]) => [((mercX(lon) - x0) / (x1 - x0)) * W, ((mercY(lat) - y0) / (y1 - y0)) * H];
}

/**
 * The first `p` (0..1) of a polyline, as an SVG path. Returns "" below one
 * segment, so an arrow never flashes as a dot before it has anywhere to go.
 */
export function partialPath(pts: LatLng[], p: number, px: (q: LatLng) => [number, number]): string {
  if (p <= 0) return "";
  const n = pts.length - 1;
  const span = Math.min(p, 1) * n;
  const full = Math.floor(span);
  const out: [number, number][] = [];
  for (let i = 0; i <= Math.min(full, n); i++) out.push(px(pts[i]!));
  if (full < n) {
    const f = span - full;
    const [ax, ay] = px(pts[full]!);
    const [bx, by] = px(pts[full + 1]!);
    out.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
  }
  if (out.length < 2) return "";
  return out.map((q, i) => (i ? "L" : "M") + q.map((v) => v.toFixed(1)).join(" ")).join(" ");
}

/**
 * `t`, carried forward smoothly between the audio's sparse `timeupdate` ticks.
 *
 * The audio element only fires about four times a second, which would animate
 * at four frames a second. So the position is re-anchored on every tick and
 * carried forward on requestAnimationFrame in between — the audio stays the
 * reference, the eye gets sixty frames. Frozen when paused or once `until` has
 * passed, so nothing spins for nothing, and never more than half a second
 * ahead, so a late tick cannot outrun the voice.
 */
export function useSmoothTime(t: number, playing: boolean, until: number): number {
  const anchor = useRef({ t, at: 0 });
  const [, tick] = useState(0);
  if (anchor.current.t !== t) anchor.current = { t, at: typeof performance !== "undefined" ? performance.now() : 0 };

  const live = playing && t < until;
  useEffect(() => {
    if (!live) return;
    let raf = 0;
    const loop = () => { tick((n) => n + 1); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  if (!live) return t;
  const ahead = (performance.now() - anchor.current.at) / 1000;
  return t + Math.min(ahead, 0.5);
}
