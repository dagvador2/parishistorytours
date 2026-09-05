/**
 * Photo conversion rules shared by build-photos.ts (which writes the WebP
 * files) and generate-audio.ts (which records their size in the manifest).
 * Source PNGs live in design/audioguide-handoff/photos/, several are low-res
 * scans: never upscale.
 */
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { PATHS } from "./sections.ts";

export const PHOTO_MAX_WIDTH = 1200;
export const PHOTO_WEBP_QUALITY = 82;

export function photoSourcePath(name: string): string {
  return resolve(PATHS.handoffDir, "photos", `${name}.png`);
}
export function photoOutputPath(name: string): string {
  return resolve(PATHS.photosDir, `${name}.webp`);
}

export function listPhotoNames(): string[] {
  return readdirSync(resolve(PATHS.handoffDir, "photos"))
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.slice(0, -4))
    .sort();
}

/** Output size after the resize rule (width capped, aspect kept, no upscale). */
export async function photoOutputDims(name: string): Promise<{ w: number; h: number }> {
  const meta = await sharp(photoSourcePath(name)).metadata();
  const w0 = meta.width ?? 0;
  const h0 = meta.height ?? 0;
  if (!w0 || !h0) throw new Error(`cannot read dimensions of ${name}.png`);
  if (w0 <= PHOTO_MAX_WIDTH) return { w: w0, h: h0 };
  return { w: PHOTO_MAX_WIDTH, h: Math.round((h0 * PHOTO_MAX_WIDTH) / w0) };
}
