/**
 * Convert the 33 handoff photos (PNG, extracted from the PDF) to WebP for R2.
 *
 *   pnpm self-guided:photos [--force]
 *
 * Rules (shared with the manifest through lib/photos.ts): max 1200 px wide,
 * quality 82, never upscale (several are low-res scans; the webapp shows them
 * with object-fit: cover). File names are kept: config/media-cues.*.json and
 * the manifest reference them. Writes output/photos/<name>.webp and an index
 * output/photos/photos.json with the final dimensions and sizes.
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { parseArgs } from "./lib/args.ts";
import { fmtBytes, log } from "./lib/log.ts";
import { PHOTO_MAX_WIDTH, PHOTO_WEBP_QUALITY, listPhotoNames, photoOutputDims, photoOutputPath, photoSourcePath } from "./lib/photos.ts";
import { PATHS, R2_KEYS } from "./lib/sections.ts";

async function main() {
  const args = parseArgs();
  const force = args.has("force");
  mkdirSync(PATHS.photosDir, { recursive: true });
  const names = listPhotoNames();
  log.step(`build-photos: ${names.length} PNG -> WebP (max ${PHOTO_MAX_WIDTH} px, q${PHOTO_WEBP_QUALITY})`);

  const index: Record<string, { key: string; w: number; h: number; bytes: number }> = {};
  let inBytes = 0;
  let outBytes = 0;
  let converted = 0;
  for (const name of names) {
    const src = photoSourcePath(name);
    const out = photoOutputPath(name);
    const srcSize = statSync(src).size;
    inBytes += srcSize;
    const upToDate = !force && existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;
    if (!upToDate) {
      await sharp(src)
        .rotate() // honour EXIF orientation if any
        .resize({ width: PHOTO_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: PHOTO_WEBP_QUALITY, effort: 6 })
        .toFile(out);
      converted++;
    }
    const meta = await sharp(out).metadata();
    const expected = await photoOutputDims(name);
    if (meta.width !== expected.w || meta.height !== expected.h) {
      throw new Error(`${name}: got ${meta.width}x${meta.height}, manifest rule expects ${expected.w}x${expected.h}`);
    }
    const size = statSync(out).size;
    outBytes += size;
    index[name] = { key: R2_KEYS.photo(name), w: meta.width!, h: meta.height!, bytes: size };
    log.info("photo", `${name.padEnd(7)} ${String(meta.width).padStart(4)}x${String(meta.height).padEnd(4)} ${fmtBytes(srcSize).padStart(9)} -> ${fmtBytes(size).padStart(9)}${upToDate ? " (up to date)" : ""}`);
  }
  writeFileSync(resolve(PATHS.photosDir, "photos.json"), JSON.stringify(index, null, 2) + "\n");
  log.step(`done: ${converted} converted, ${names.length - converted} unchanged, ${fmtBytes(inBytes)} PNG -> ${fmtBytes(outBytes)} WebP (${Math.round((1 - outBytes / inBytes) * 100)} % smaller)`);
  const heavy = Object.entries(index).filter(([, v]) => v.bytes > 200 * 1024);
  if (heavy.length) log.warn("photo", `${heavy.length} file(s) above 200 KB: ${heavy.map(([k, v]) => `${k} ${fmtBytes(v.bytes)}`).join(", ")}`);
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
