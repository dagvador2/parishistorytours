/**
 * Rebuild the walking polyline of `left-bank-ww2.ts` by routing between the
 * stops on the real footpath network.
 *
 *   pnpm tsx scripts/self-guided/tools/route-from-osrm.ts [--write]
 *
 * The hand-written `ROUTE` cut straight across blocks — fine as a sketch,
 * wrong on a map the visitor navigates with. This asks the OSM foot router for
 * each leg, then simplifies the result so the data file stays readable.
 *
 * Public service, no key, used gently (one request per leg). It routes on
 * footways, so it goes through the Jardin du Luxembourg rather than around it.
 * Always eyeball the regenerated map afterwards: a router follows the network,
 * not the narration.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STOPS, type LatLng } from "../../../src/data/self-guided/left-bank-ww2.ts";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { PATHS } from "../lib/sections.ts";

const BASE = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";

/**
 * Points the walk must pass through on the way to a stop, because the router
 * would otherwise pick a shorter way than the one the narration describes.
 * The garden alleys carry opening hours, so the router skirts the Jardin du
 * Luxembourg along Rue de Vaugirard — but the audio says to walk through it.
 */
const VIA: Record<string, LatLng[]> = {
  "03-fall-of-paris": [[48.84745, 2.33951], [48.84772, 2.33835]],
};

/** Perpendicular distance in metres, flat-earth over a few hundred metres. */
function perp(p: LatLng, a: LatLng, b: LatLng): number {
  const k = Math.cos((a[0] * Math.PI) / 180);
  const toM = 111_320;
  const [px, py] = [(p[1] - a[1]) * k * toM, (p[0] - a[0]) * toM];
  const [bx, by] = [(b[1] - a[1]) * k * toM, (b[0] - a[0]) * toM];
  const len2 = bx * bx + by * by;
  if (!len2) return Math.hypot(px, py);
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return Math.hypot(px - bx * t, py - by * t);
}

/** Douglas-Peucker: drop points that sit within `tol` metres of the line. */
function simplify(pts: LatLng[], tol: number): LatLng[] {
  if (pts.length < 3) return pts;
  let worst = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perp(pts[i]!, pts[0]!, pts[pts.length - 1]!);
    if (d > worst) { worst = d; idx = i; }
  }
  if (worst <= tol) return [pts[0]!, pts[pts.length - 1]!];
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
}

async function main() {
  const args = parseArgs();
  const tol = Number(args.get("tolerance") ?? 4);
  // One request with every stop as a waypoint, not a request per leg: routing
  // leg by leg and pinning each end to its stop produced a spike at every
  // stop, where the router's snap point sat on the other side of the street.
  // The intro and stop 1 are the same address, so the intro is dropped here.
  const waypoints = STOPS.filter((s, i) => i !== 0 || s.kind !== "intro");
  const coords = waypoints
    .flatMap((s) => [...(VIA[s.sectionId] ?? []), s.pos])
    .map((p) => `${p[1]},${p[0]}`)
    .join(";");
  const url = `${BASE}/${coords}?overview=full&geometries=geojson&continue_straight=false`;
  const r = await fetch(url, { headers: { "User-Agent": "PHT-audioguide/1.0 (clemdaguetschott@gmail.com)" } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  const j = await r.json() as {
    code: string;
    routes: { distance: number; geometry: { coordinates: [number, number][] } }[];
    waypoints: { distance: number; location: [number, number] }[];
  };
  if (j.code !== "Ok" || !j.routes[0]) throw new Error(`routing failed: ${j.code}`);
  const labels = waypoints.flatMap((s) => [...(VIA[s.sectionId] ?? []).map(() => "  (via)"), s.sectionId]);
  for (const [i, w] of j.waypoints.entries()) {
    log.info("stop", `${(labels[i] ?? "?").padEnd(20)} snapped ${Math.round(w.distance)} m from the recorded position`);
  }

  const metres = j.routes[0].distance;
  // GeoJSON is [lon, lat]; the app is [lat, lng].
  const pts: LatLng[] = j.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon] as LatLng);
  const rounded0 = simplify(pts, tol);
  const route = rounded0;

  const round = (p: LatLng): LatLng => [Number(p[0].toFixed(5)), Number(p[1].toFixed(5))];
  const rounded = route.map(round);

  const lines: string[] = [];
  for (let i = 0; i < rounded.length; i += 5) {
    lines.push("  " + rounded.slice(i, i + 5).map((p) => `[${p[0]}, ${p[1]}]`).join(", ") + ",");
  }
  const block = `export const ROUTE: LatLng[] = [\n${lines.join("\n")}\n];`;
  log.step(`${rounded.length} points, ${(metres / 1000).toFixed(2)} km walked`);

  if (!args.has("write")) { console.log("\n" + block + "\n\n(--write to apply)"); return; }
  const file = resolve(PATHS.root ?? process.cwd(), "src/data/self-guided/left-bank-ww2.ts");
  const src = readFileSync(file, "utf8");
  const re = /export const ROUTE: LatLng\[\] = \[[\s\S]*?\n\];/;
  if (!re.test(src)) throw new Error("ROUTE array not found in left-bank-ww2.ts");
  writeFileSync(file, src.replace(re, block));
  log.info("write", `${file} updated`);
}

main().catch((e) => { log.error("fatal", e instanceof Error ? e.stack ?? e.message : String(e)); process.exit(1); });
