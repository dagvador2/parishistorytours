/** Small geodesy helpers, same formulas as the design prototype. */
import type { LatLng } from "../../data/self-guided/left-bank-ww2";

const R = 6371000;
const rad = Math.PI / 180;

/** Great-circle distance in metres. */
export function dist(a: LatLng, b: LatLng): number {
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Initial bearing from a to b, degrees clockwise from north, 0–360. */
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin((b[1] - a[1]) * rad) * Math.cos(b[0] * rad);
  const x = Math.cos(a[0] * rad) * Math.sin(b[0] * rad) - Math.sin(a[0] * rad) * Math.cos(b[0] * rad) * Math.cos((b[1] - a[1]) * rad);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** "m:ss" */
export function mmss(s: number): string {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
}

/** "1 h 34" / "48 min" for the completion recap. */
export function hoursMinutes(sec: number, hourLabel = "h", minLabel = "min"): string {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} ${minLabel}`;
  return `${Math.floor(m / 60)} ${hourLabel} ${String(m % 60).padStart(2, "0")}`;
}

/** Length of a polyline in metres. */
export function pathLength(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}
