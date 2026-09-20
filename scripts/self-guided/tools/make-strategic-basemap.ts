/**
 * The washed basemap the 1944 Allied advance is drawn on, live.
 *
 *   pnpm tsx scripts/self-guided/tools/make-strategic-basemap.ts [--wash .94]
 *
 * Writes `map_1944` (tiles only — no arrows, no type) plus
 * `config/strategic-map.json`, which carries the Mercator bounds of that image.
 * With those bounds the player projects the arrows of
 * `src/data/self-guided/strategic-1944.ts` onto the photo itself and advances
 * them on the audio clock — the same arrangement as the May 1940 map.
 *
 * It replaces the still `tools/make-strategic-map.ts` drew: that one could show
 * Normandy, Paris and Berlin, but not the argument the narration makes over
 * them (what a liberated capital costs, and the road round it).
 *
 * The attribution is NOT burnt in here: the player draws it, crisply, inside
 * the safe area. It still must be shown.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STRATEGIC_CORNERS, STRATEGIC_ZOOM } from "../../../src/data/self-guided/strategic-1944.ts";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { buildMapCanvas } from "../lib/maptiles.ts";
import { PATHS } from "../lib/sections.ts";

(async () => {
  const args = parseArgs();
  const canvas = await buildMapCanvas({
    points: STRATEGIC_CORNERS,
    zoom: Number(args.get("zoom") ?? STRATEGIC_ZOOM),
    wash: Number(args.get("wash") ?? 0.94),
    style: args.get("style") ?? "osm",
    width: Number(args.get("width") ?? 1400),
    // The window is already the one the story needs; nothing to pad.
    marginDeg: 0,
    headroom: 0,
  });
  writeFileSync(resolve(PATHS.handoffDir, "photos", "map_1944.png"), canvas.png);
  const meta = { width: canvas.width, height: canvas.height, zoom: canvas.zoom, credit: canvas.credit, proj: canvas.proj };
  writeFileSync(resolve(PATHS.configDir, "strategic-map.json"), JSON.stringify(meta, null, 2) + "\n");
  log.info("carte", `map_1944 — ${canvas.width}x${canvas.height} (rapport ${(canvas.width / canvas.height).toFixed(2)}:1), ${(canvas.png.length / 1024).toFixed(0)} KB`);
  log.info("carte", `config/strategic-map.json écrit`);
})();
