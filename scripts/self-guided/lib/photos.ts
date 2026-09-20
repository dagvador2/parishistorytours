/**
 * Photo conversion rules shared by build-photos.ts (which writes the WebP
 * files) and generate-audio.ts (which records their size in the manifest).
 * Source PNGs live in design/audioguide-handoff/photos/, several are low-res
 * scans: never upscale.
 */
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { PATHS } from "./sections.ts";

export const PHOTO_MAX_WIDTH = 1200;
export const PHOTO_WEBP_QUALITY = 82;

/**
 * Sources are PNG (the pages extracted from the printed guide) or JPEG (the
 * archive photos downloaded from Wikimedia Commons, which are JPEG at the
 * source: re-encoding them to PNG would triple the repo weight for no gain).
 */
export const PHOTO_SOURCE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;

export function photoSourcePath(name: string): string {
  const dir = resolve(PATHS.handoffDir, "photos");
  for (const ext of PHOTO_SOURCE_EXTENSIONS) {
    const file = resolve(dir, `${name}${ext}`);
    if (existsSync(file)) return file;
  }
  return resolve(dir, `${name}.png`); // report the canonical name when missing
}

/**
 * A cue whose image is a clip (tools/make-video-loop.ts) has two files under
 * the same name: `<name>.mp4`, the loop the player runs in a <video>, and
 * `<name>.webp`, its first frame. The still is the poster, and it is what the
 * contact sheet, the well preview and the review DOCX show — so a clip needs
 * no special case anywhere a photo is merely looked at.
 *
 * The clip is copied to the bucket as it is; only the poster goes through the
 * resize and quality rules.
 */
export function clipSourcePath(name: string): string | undefined {
  const file = resolve(PATHS.handoffDir, "photos", `${name}.mp4`);
  return existsSync(file) ? file : undefined;
}

export function clipOutputPath(name: string): string {
  return resolve(PATHS.photosDir, `${name}.mp4`);
}

export function isClip(name: string): boolean {
  return clipSourcePath(name) !== undefined;
}

/** Every clip on the disk, poster or no poster (build-photos checks for one). */
export function listClipNames(): string[] {
  return readdirSync(resolve(PATHS.handoffDir, "photos"))
    .filter((f) => f.endsWith(".mp4"))
    .map((f) => f.slice(0, -4))
    .sort();
}

export function photoOutputPath(name: string): string {
  return resolve(PATHS.photosDir, `${name}.webp`);
}

export function listPhotoNames(): string[] {
  const dir = readdirSync(resolve(PATHS.handoffDir, "photos"));
  const still = dir
    .filter((f) => PHOTO_SOURCE_EXTENSIONS.some((e) => f.endsWith(e)))
    .map((f) => f.slice(0, f.lastIndexOf(".")));
  const webp = dir.filter((f) => f.endsWith(".webp")).map((f) => f.slice(0, -5));
  return [...new Set([...still, ...webp])].sort();
}

/**
 * Output size after the resize rule (width capped, aspect kept, no upscale).
 * For a clip these are the poster's dimensions, which are the clip's own: the
 * player reserves the same box for both.
 */
export async function photoOutputDims(name: string): Promise<{ w: number; h: number }> {
  const meta = await sharp(photoSourcePath(name)).metadata();
  const w0 = meta.width ?? 0;
  const h0 = meta.height ?? 0;
  if (!w0 || !h0) throw new Error(`cannot read dimensions of ${photoSourcePath(name)}`);
  if (w0 <= PHOTO_MAX_WIDTH) return { w: w0, h: h0 };
  return { w: PHOTO_MAX_WIDTH, h: Math.round((h0 * PHOTO_MAX_WIDTH) / w0) };
}
