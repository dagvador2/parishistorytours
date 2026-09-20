/**
 * Turn a phone clip into a seamless loop for the photo well.
 *
 *   pnpm tsx scripts/self-guided/tools/make-video-loop.ts \
 *     --in design/audioguide-handoff/video/sorbonne-impacts.mov \
 *     --name anim_sorbonne_impacts
 *
 * Writes two files next to the photos, both named after the cue:
 *   <name>.mp4   the loop itself, H.264, 30 fps
 *   <name>.webp  its first frame, which is the poster and the still every
 *                other tool (contact sheet, well preview, review DOCX) uses.
 *
 * Why H.264 and not an animated WebP, which is what this tool wrote until
 * September 2026: WebP has no real motion compensation, so a moving shot costs
 * roughly the same per frame whatever the frame rate. At the 8 fps it took to
 * keep the file under 4 MB the sweep stuttered; the same 11 s at 30 fps came
 * out at 15 MB, which is more than every other photo of the tour put together.
 * The same clip as H.264 is 1.6 MB at 30 fps. A <video> also plays under the
 * player's control — it pauses with the narration and follows a seek — where an
 * animated WebP runs on its own clock (the same reason the two maps are drawn
 * live; see the README).
 *
 * The frame is cropped to the well's ~1.3:1 from the centre of the source, so
 * a portrait clip keeps the band the eye is on rather than being letterboxed.
 *
 * The clip is written forward then backward ("ping-pong"). A travelling shot
 * cut back to its first frame jumps hard every loop; played back down it reads
 * as a slow sweep that never ends. It doubles the length, and costs much less
 * than double: the return leg is the outward one's frames, so it predicts well.
 */
import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { parseArgs } from "../lib/args.ts";
import { assertFfmpeg, probeDurationSec } from "../lib/ffmpeg.ts";
import { fmtBytes, log } from "../lib/log.ts";
import { PHOTO_MAX_WIDTH, PHOTO_WEBP_QUALITY } from "../lib/photos.ts";
import { PATHS } from "../lib/sections.ts";

const run = promisify(execFile);
const WELL_RATIO = 1.3;

async function main() {
  const args = parseArgs();
  const input = args.get("in");
  const name = args.get("name");
  if (!input || !name) throw new Error("usage: --in <video> --name <anim_name> [--width 720] [--fps 30] [--crf 26] [--no-pingpong]");
  const width = Number(args.get("width") ?? 720);
  const fps = Number(args.get("fps") ?? 30);
  const crf = Number(args.get("crf") ?? 26);
  const pingpong = !args.has("no-pingpong");
  await assertFfmpeg();

  const meta = await run("ffprobe", ["-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", input]);
  const [sw, sh] = meta.stdout.trim().split("\n")[0]!.split("x").map(Number) as [number, number];
  const cropH = Math.min(sh, Math.round(sw / WELL_RATIO));
  const cropW = Math.min(sw, Math.round(cropH * WELL_RATIO));
  log.step(`${name}: source ${sw}x${sh} -> centre crop ${cropW}x${cropH} -> ${width} px, ${fps} fps, crf ${crf}${pingpong ? ", ping-pong" : ""}`);

  // The even-height scale (-2) H.264 needs, then the return leg. `reverse`
  // holds the whole clip in memory, which is fine for the ten-second shots
  // this tool is for.
  const crop = `crop=${cropW}:${cropH}:(iw-${cropW})/2:(ih-${cropH})/2,fps=${fps},scale=${width}:-2,setsar=1`;
  const filter = pingpong
    // drop the two end frames of the return leg: repeating them would stall
    // the sweep for a beat at each turn
    ? `[0:v]${crop},split[a][b];[b]trim=start_frame=1,setpts=PTS-STARTPTS,reverse,trim=start_frame=1[r];[a][r]concat=n=2:v=1[v]`
    : `[0:v]${crop}[v]`;

  const out = resolve(PATHS.handoffDir, "photos", `${name}.mp4`);
  await run("ffmpeg", ["-v", "error", "-y", "-i", input,
    "-filter_complex", filter, "-map", "[v]", "-an",
    "-c:v", "libx264", "-preset", "slow", "-crf", String(crf),
    "-profile:v", "high", "-pix_fmt", "yuv420p",
    // a keyframe every second: the player seeks inside the loop when the
    // narration is scrubbed, and a long GOP makes that slow
    "-g", String(fps), "-movflags", "+faststart", out],
    { maxBuffer: 1024 * 1024 * 64 });

  // The poster: the clip's first frame, through the still pipeline's own rules.
  const poster = resolve(PATHS.handoffDir, "photos", `${name}.webp`);
  const { stdout: png } = await run("ffmpeg", ["-v", "error", "-i", out, "-frames:v", "1", "-f", "image2", "-c:v", "png", "-"],
    { encoding: "buffer", maxBuffer: 1024 * 1024 * 64 });
  await sharp(png).resize({ width: PHOTO_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: PHOTO_WEBP_QUALITY, effort: 6 }).toFile(poster);

  const seconds = (await probeDurationSec(out)).toFixed(1);
  const m = await sharp(poster).metadata();
  log.info("loop", `${name} — ${m.width}x${m.height}, ${seconds} s, ${fmtBytes(statSync(out).size)} (mp4) + ${fmtBytes(statSync(poster).size)} (poster)`);
}

main().catch((e) => { log.error("fatal", e instanceof Error ? e.stack ?? e.message : String(e)); process.exit(1); });
