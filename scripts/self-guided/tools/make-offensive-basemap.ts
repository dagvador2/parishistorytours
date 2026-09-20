/**
 * The washed basemap the May 1940 offensive is drawn on, live.
 *
 *   pnpm tsx scripts/self-guided/tools/make-offensive-basemap.ts [--wash .9]
 *
 * Writes `map_1940` (tiles only — no arrows, no type) plus
 * `config/offensive-map.json`, which carries the Mercator bounds of that image.
 * With those bounds the player projects the arrows of
 * `src/data/self-guided/offensive-1940.ts` onto the photo itself and advances
 * them on the audio clock — the same arrangement as the route map.
 *
 * The attribution is NOT burnt in here: the player draws it, crisply, inside
 * the safe area. It still must be shown.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { OFFENSIVE_CORNERS, OFFENSIVE_ZOOM } from "../../../src/data/self-guided/offensive-1940.ts";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { buildMapCanvas } from "../lib/maptiles.ts";
import { PATHS } from "../lib/sections.ts";

(async () => {
  const args = parseArgs();
  const canvas = await buildMapCanvas({
    points: OFFENSIVE_CORNERS,
    zoom: Number(args.get("zoom") ?? OFFENSIVE_ZOOM),
    wash: Number(args.get("wash") ?? 0.9),
    style: args.get("style") ?? "osm",
    width: Number(args.get("width") ?? 1400),
    // The window is already the one the story needs; nothing to pad.
    marginDeg: 0,
    headroom: 0,
  });
  writeFileSync(resolve(PATHS.handoffDir, "photos", "map_1940.png"), canvas.png);
  const meta = { width: canvas.width, height: canvas.height, zoom: canvas.zoom, credit: canvas.credit, proj: canvas.proj };
  writeFileSync(resolve(PATHS.configDir, "offensive-map.json"), JSON.stringify(meta, null, 2) + "\n");
  log.info("carte", `map_1940 — ${canvas.width}x${canvas.height} (rapport ${(canvas.width / canvas.height).toFixed(2)}:1), ${(canvas.png.length / 1024).toFixed(0)} KB`);
  log.info("carte", `config/offensive-map.json écrit`);
})();
