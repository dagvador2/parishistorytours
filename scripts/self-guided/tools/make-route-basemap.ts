/**
 * The bare washed basemap the webapp draws the route on, live.
 *
 *   pnpm tsx scripts/self-guided/tools/make-route-basemap.ts [--zoom 16] [--wash .92]
 *
 * Writes `map_base` (tiles only — no route, no markers, no type) plus
 * `config/route-map.json`, which carries the Mercator bounds of that image.
 * With those bounds the player projects `ROUTE` and `STOPS` onto the photo
 * itself, so the animation runs on the audio clock: it pauses when the audio
 * pauses, and seeking lands where you left it.
 *
 * The attribution is NOT burnt in here — the player draws it, crisply, over
 * the map. It still must be shown.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROUTE } from "../../../src/data/self-guided/left-bank-ww2.ts";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { buildMapCanvas } from "../lib/maptiles.ts";
import { PATHS } from "../lib/sections.ts";

(async () => {
  const args = parseArgs();
  const canvas = await buildMapCanvas({
    points: ROUTE,
    zoom: Number(args.get("zoom") ?? 16),
    wash: Number(args.get("wash") ?? 0.92),
    style: args.get("style") ?? "osm",
    width: Number(args.get("width") ?? 1400),
    headroom: 0,
  });
  writeFileSync(resolve(PATHS.handoffDir, "photos", "map_base.png"), canvas.png);
  const meta = { width: canvas.width, height: canvas.height, zoom: canvas.zoom, credit: canvas.credit, proj: canvas.proj };
  writeFileSync(resolve(PATHS.configDir, "route-map.json"), JSON.stringify(meta, null, 2) + "\n");
  log.info("carte", `map_base — ${canvas.width}x${canvas.height} (rapport ${(canvas.width / canvas.height).toFixed(2)}:1), ${(canvas.png.length / 1024).toFixed(0)} KB`);
  log.info("carte", `config/route-map.json écrit`);
})();
