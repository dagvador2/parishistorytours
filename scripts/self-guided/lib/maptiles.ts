/**
 * The washed OpenStreetMap canvas the route map and its animation are drawn on.
 *
 * Both tools need exactly the same frame — same bounds, same projection, same
 * wash — or the still and the animation would not line up. So the frame is
 * built once here and they only draw on top.
 */
import sharp from "sharp";
import type { LatLng } from "../../../src/data/self-guided/left-bank-ww2.ts";

/**
 * Base map. The stock OSM style is very busy at street zoom — every shop, every
 * kerb — and fights the route. CARTO's Positron styles are the same data drawn
 * quietly (`nolabels` drops street names entirely) but their tiles carry an
 * "API KEY REQUIRED" watermark until a free key is set.
 *
 * `mapbox-light` is the style the rest of the site already draws its maps in
 * (see src/components/TourMap.tsx): neutral grey, almost no POI furniture. Its
 * 512 px tiles are indexed on the same z/x/y grid as the others, so a frame
 * built from it lands in exactly the same register. It needs
 * PUBLIC_MAPBOX_TOKEN, and whatever it draws must carry the Mapbox credit.
 */
export const STYLES: Record<string, { url: (z: number, x: number, y: number) => string; tilePx: number; credit: string }> = {
  osm: { url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, tilePx: 256, credit: "Fond de carte © OpenStreetMap contributors" },
  carto: { url: (z, x, y) => `https://basemaps.cartocdn.com/light_all/${z}/${x}/${y}@2x.png`, tilePx: 512, credit: "Fond de carte © OpenStreetMap contributors © CARTO" },
  "carto-nolabels": { url: (z, x, y) => `https://basemaps.cartocdn.com/light_nolabels/${z}/${x}/${y}@2x.png`, tilePx: 512, credit: "Fond de carte © OpenStreetMap contributors © CARTO" },
  "mapbox-light": {
    // Names come out as this style ships them — in Paris that is French for the
    // streets and English for a couple of monuments ("Luxembourg Palace"), the
    // same as the site's other maps. `language=fr` is accepted here and changes
    // nothing on these layers; do not put it back.
    url: (z, x, y) => `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/512/${z}/${x}/${y}?access_token=${process.env.PUBLIC_MAPBOX_TOKEN ?? ""}`,
    tilePx: 512,
    credit: "© Mapbox © OpenStreetMap",
  },
};

export const PAPER = "#F7F3EC";

function get(url: string): Promise<Buffer> {
  return new Promise((res, rej) => {
    import("node:https").then(({ default: https }) => {
      https.get(url, { headers: { "User-Agent": "PHT-audioguide/1.0 (clemdaguetschott@gmail.com)" } }, (r) => {
        if (r.statusCode !== 200) { r.resume(); return rej(new Error(`${url} -> ${r.statusCode}`)); }
        const c: Buffer[] = [];
        r.on("data", (d) => c.push(d as Buffer));
        r.on("end", () => res(Buffer.concat(c)));
      }).on("error", rej);
    });
  });
}

export interface MapCanvasOptions {
  /** every point that must be inside the frame */
  points: LatLng[];
  zoom?: number;
  width?: number;
  /** target aspect; the player's photo well is ~1.3:1 */
  wellRatio?: number;
  /** 0 = raw tiles, 1 = a pale ghost behind whatever is drawn on top */
  wash?: number;
  style?: string;
  /** degrees of latitude kept around the points */
  marginDeg?: number;
  /** extra share of height added at the top, for a title banner */
  headroom?: number;
  /** ground the frame sits on, and what the wash fades the tiles towards */
  paper?: string;
  /** warm cast laid over the tiles; null leaves their own colour alone */
  tint?: string | null;
}

/**
 * Normalised Web Mercator bounds of the frame (0..1 over the whole world).
 * Published in the manifest so the webapp can project the route onto the
 * basemap itself, live, instead of being handed a pre-rendered animation.
 */
export interface MapProjection { x0: number; x1: number; y0: number; y1: number }

export interface MapCanvas {
  png: Buffer;
  width: number;
  height: number;
  /** lat/lng -> pixel in the finished frame */
  px(p: LatLng): [number, number];
  proj: MapProjection;
  credit: string;
  zoom: number;
}

export async function buildMapCanvas(opts: MapCanvasOptions): Promise<MapCanvas> {
  const {
    points, zoom = 16, width = 1200, wellRatio = 1.3,
    wash = 0.92, style: styleName = "osm", marginDeg = 0.0012, headroom = 0.14,
    paper = PAPER, tint = "#EFE8DB",
  } = opts;
  const style = STYLES[styleName];
  if (!style) throw new Error(`unknown style ${styleName} (${Object.keys(STYLES).join(", ")})`);

  const lon2x = (lon: number) => ((lon + 180) / 360) * 2 ** zoom;
  const lat2y = (lat: number) => {
    const r = (lat * Math.PI) / 180;
    return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** zoom;
  };

  let latMin = Math.min(...points.map((p) => p[0])) - marginDeg;
  let latMax = Math.max(...points.map((p) => p[0])) + marginDeg;
  let lonMin = Math.min(...points.map((p) => p[1])) - marginDeg;
  let lonMax = Math.max(...points.map((p) => p[1])) + marginDeg;

  latMax += (latMax - latMin) * headroom;

  // Grow the short side until the frame matches the well, so `object-fit: cover`
  // crops nothing that matters.
  const pxW = () => (lon2x(lonMax) - lon2x(lonMin)) * 256;
  const pxH = () => (lat2y(latMin) - lat2y(latMax)) * 256;
  if (pxW() / pxH() < wellRatio) {
    const grow = (((pxH() * wellRatio - pxW()) / 256 / 2 ** zoom) * 360) / 2;
    lonMin -= grow; lonMax += grow;
  } else {
    const scale = pxW() / wellRatio / pxH();
    const mid = (latMin + latMax) / 2;
    latMin = mid - (mid - latMin) * scale;
    latMax = mid + (latMax - mid) * scale;
  }

  const S = style.tilePx;
  const x0 = Math.floor(lon2x(lonMin)), x1 = Math.floor(lon2x(lonMax));
  const y0 = Math.floor(lat2y(latMax)), y1 = Math.floor(lat2y(latMin));
  const tiles: sharp.OverlayOptions[] = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    tiles.push({ input: await get(style.url(zoom, tx, ty)), left: (tx - x0) * S, top: (ty - y0) * S });
    await new Promise((r) => setTimeout(r, 120));
  }
  const mosaic = await sharp({
    create: { width: (x1 - x0 + 1) * S, height: (y1 - y0 + 1) * S, channels: 3, background: paper },
  }).composite(tiles).png().toBuffer();

  const cropL = Math.round((lon2x(lonMin) - x0) * S);
  const cropT = Math.round((lat2y(latMax) - y0) * S);
  const cw = Math.round((lon2x(lonMax) - lon2x(lonMin)) * S);
  const ch = Math.round((lat2y(latMin) - lat2y(latMax)) * S);
  const height = Math.round((ch / cw) * width);

  const washed = sharp(mosaic).extract({ left: cropL, top: cropT, width: cw, height: ch })
    .modulate({ saturation: 1 - wash * 0.9, brightness: 1 + wash * 0.06 });
  const map = await (tint ? washed.tint(tint) : washed).resize(width, height).png().toBuffer();
  const png = await sharp({ create: { width, height, channels: 4, background: paper } })
    .composite([{ input: await sharp(map).ensureAlpha(1 - wash * 0.45).png().toBuffer() }])
    .png().toBuffer();

  const k = width / cw;
  const world = 2 ** zoom;
  return {
    png, width, height, credit: style.credit, zoom,
    proj: {
      x0: lon2x(lonMin) / world, x1: lon2x(lonMax) / world,
      y0: lat2y(latMax) / world, y1: lat2y(latMin) / world,
    },
    px: ([lat, lon]) => [((lon2x(lon) - x0) * S - cropL) * k, ((lat2y(lat) - y0) * S - cropT) * k],
  };
}
