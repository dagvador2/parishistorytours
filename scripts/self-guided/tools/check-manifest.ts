/**
 * Validate generated manifests against the webapp contract and the local files.
 *
 *   pnpm tsx scripts/self-guided/tools/check-manifest.ts [--lang en|fr|both]
 *
 * Checks: 9 sections in order, MP3 present with matching duration, subtitle and
 * media times monotonic and inside the audio, every photo referenced exists as
 * WebP with the recorded size, captions non-empty, no subtitle longer than
 * 220 characters (warning above 170), no residual spelled-out year in the displayed text.
 */
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "../lib/args.ts";
import { probeDurationSec } from "../lib/ffmpeg.ts";
import { fmtDuration, log } from "../lib/log.ts";
import { loadManifest, loadWords } from "../lib/manifest.ts";
import { photoOutputDims } from "../lib/photos.ts";
import { PATHS, SECTIONS, parseLangs } from "../lib/sections.ts";

const YEAR_WORDS = /\b(nineteen (twenty|thirty|forty|fifty|sixty)|mille (huit|neuf) cent)\b/i;

async function main() {
  const args = parseArgs();
  let problems = 0;
  const fail = (msg: string) => {
    problems++;
    log.error("check", msg);
  };

  for (const lang of parseLangs(args.get("lang"))) {
    const m = loadManifest(lang);
    if (!m) {
      fail(`${lang}: no manifest`);
      continue;
    }
    const words = loadWords(lang);
    log.step(`${lang}: ${m.sections.length}/9 sections, ${fmtDuration(m.totalDurationSec)}, voice ${m.voice.voiceId.slice(0, 8)}… (${m.voice.model})`);
    const ids = m.sections.map((s) => s.id);
    const expected = SECTIONS.map((s) => s.id);
    if (ids.join() !== expected.join()) fail(`${lang}: section order/ids ${ids.join(",")} != ${expected.join(",")}`);

    let subs = 0;
    let media = 0;
    for (const s of m.sections) {
      const scope = `${lang}/${s.id}`;
      const mp3 = resolve(PATHS.audioDir, lang, `${s.id}.mp3`);
      if (!existsSync(mp3)) fail(`${scope}: missing ${mp3}`);
      else {
        const d = await probeDurationSec(mp3);
        if (Math.abs(d - s.durationSec) > 0.2) fail(`${scope}: durationSec ${s.durationSec} but file is ${d.toFixed(2)} s`);
        if (statSync(mp3).size > 15 * 1024 * 1024) fail(`${scope}: MP3 above 15 MB`);
      }
      if (s.subs.length === 0 || s.subs[0]!.t !== 0) fail(`${scope}: subtitles must start at t=0`);
      let last = -1;
      for (const sub of s.subs) {
        if (sub.t < last) fail(`${scope}: subtitle time goes backwards at ${sub.t} ("${sub.text.slice(0, 40)}…")`);
        last = Math.max(last, sub.t);
        if (sub.t > s.durationSec) fail(`${scope}: subtitle at ${sub.t} after the end (${s.durationSec})`);
        // the design shrinks the font above 110 / 170 chars; only truly unreadable pieces fail
        if (sub.text.length > 220) fail(`${scope}: subtitle of ${sub.text.length} chars: "${sub.text.slice(0, 50)}…"`);
        else if (sub.text.length > 170) log.warn("check", `${scope}: long subtitle (${sub.text.length} chars): "${sub.text.slice(0, 50)}…"`);
        if (YEAR_WORDS.test(sub.text)) fail(`${scope}: spelled-out year left in "${sub.text.slice(0, 60)}…"`);
        if (!sub.text.trim()) fail(`${scope}: empty subtitle at ${sub.t}`);
      }
      subs += s.subs.length;
      let lastM = -1;
      for (const md of s.media) {
        if (md.t < lastM) fail(`${scope}: media time goes backwards at ${md.t}`);
        lastM = Math.max(lastM, md.t);
        if (md.t > s.durationSec) fail(`${scope}: media at ${md.t} after the end`);
        if (!md.cap.trim()) fail(`${scope}: empty caption for ${md.img}`);
        const name = md.img.replace(/^photos\/[^/]+\//, "").replace(/\.webp$/, "");
        const webp = resolve(PATHS.photosDir, `${name}.webp`);
        if (!existsSync(webp)) fail(`${scope}: photo not built: ${webp} (run pnpm self-guided:photos)`);
        const dims = await photoOutputDims(name).catch(() => undefined);
        if (!dims) fail(`${scope}: unknown photo ${name}`);
        else if (dims.w !== md.w || dims.h !== md.h) fail(`${scope}: ${name} is ${dims.w}x${dims.h}, manifest says ${md.w}x${md.h}`);
      }
      media += s.media.length;
      const w = words?.sections[s.id];
      if (!w || w.length === 0) fail(`${scope}: no words in sidecar`);
      else if (w.at(-1)!.end > s.durationSec + 0.5) fail(`${scope}: last word ends at ${w.at(-1)!.end} > duration ${s.durationSec}`);
      log.info(scope, `${fmtDuration(s.durationSec).padStart(5)}  ${String(s.subs.length).padStart(3)} subs  ${String(s.media.length).padStart(2)} photos  ${w?.length ?? 0} words`);
    }
    log.info(lang, `${subs} subtitles, ${media} photo cues in total`);
  }
  if (problems) {
    log.error("check", `${problems} problem(s)`);
    process.exit(1);
  }
  log.info("check", "manifest OK");
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
