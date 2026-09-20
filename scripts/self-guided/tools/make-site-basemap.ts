/**
 * The basemap of the route map on the PRODUCT page (src/images/self-guided/).
 *
 *   pnpm tsx scripts/self-guided/tools/make-site-basemap.ts [--wash .25]
 *
 * Not the same picture as the app's `map_base`: the webapp keeps its warm
 * washed OSM frame, while the marketing page is drawn in the neutral grey the
 * rest of the site already uses for its maps (Mapbox light-v11, as in
 * src/components/TourMap.tsx). Only the paint differs — the frame is built with
 * exactly the arguments `make-route-basemap.ts` uses, and the run refuses to
 * write anything unless the projection it computes is the one already published
 * in config/route-map.json. The two images are therefore interchangeable, and
 * the route the page draws over this one lands on the same streets.
 *
 * Needs PUBLIC_MAPBOX_TOKEN (same token the site's maps use).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { ROUTE } from "../../../src/data/self-guided/left-bank-ww2.ts";
import { parseArgs } from "../lib/args.ts";
import { fmtBytes, log } from "../lib/log.ts";
import { buildMapCanvas } from "../lib/maptiles.ts";
import { PATHS } from "../lib/sections.ts";

const OUT = resolve(PATHS.root, "src/images/self-guided/route_map_base.webp");
/** Same frame as make-route-basemap.ts — anything else breaks the register. */
const FRAME = { points: ROUTE, zoom: 16, width: 1400, headroom: 0 };

(async () => {
  const args = parseArgs();
  if (!process.env.PUBLIC_MAPBOX_TOKEN) throw new Error("PUBLIC_MAPBOX_TOKEN missing (.env)");

  const canvas = await buildMapCanvas({
    ...FRAME,
    style: "mapbox-light",
    // light-v11 is already pale: a light wash is enough to push it behind the
    // drawn walk, and no warm tint at all — that is what made it look sepia.
    wash: Number(args.get("wash") ?? 0.25),
    paper: "#FFFFFF",
    tint: null,
  });

  const published = JSON.parse(readFileSync(resolve(PATHS.configDir, "route-map.json"), "utf8"));
  const drift = (["x0", "x1", "y0", "y1"] as const).map((k) => Math.abs(canvas.proj[k] - published.proj[k]));
  if (Math.max(...drift) > 1e-12) {
    throw new Error(`projection drifted from config/route-map.json (${drift.join(", ")}) — the page would draw the route off the streets`);
  }

  // 512 px tiles round the crop a pixel differently from the 256 px ones the
  // published frame was cut with. Same ground, so the image is simply held to
  // the published size rather than carrying its own.
  const webp = await sharp(canvas.png).resize(published.width, published.height).webp({ quality: 82 }).toBuffer();
  writeFileSync(OUT, webp);
  log.info("carte", `route_map_base.webp — ${published.width}x${published.height}, ${fmtBytes(webp.length)}, crédit « ${canvas.credit} »`);
  log.info("carte", "le crédit est repris tel quel par SelfGuidedRoutePreview.astro");
})();
