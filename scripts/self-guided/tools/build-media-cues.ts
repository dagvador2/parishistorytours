/**
 * Re-anchor the design handoff's photo cues onto the narration scripts.
 *
 * The handoff (`design/audioguide-handoff/tour-content.js`) anchors each photo
 * to a *condensed* subtitle sentence. The TTS reads the full scripts, so each
 * cue must point at a sentence of the script instead:
 *
 *   EN: best word-overlap between the handoff sentence and the script sentences
 *   FR: same paragraph as the EN anchor (EN and FR scripts have identical
 *       paragraph structure), same sentence ordinal within the paragraph
 *
 * Output: scripts/self-guided/config/media-cues.{en,fr}.json, the versioned
 * source of truth read by generate-audio.ts. Edit the `anchor` fields by hand
 * when the automatic choice is wrong; the report lists every decision.
 *
 *   pnpm tsx scripts/self-guided/tools/build-media-cues.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { LANGS, PATHS, SECTIONS, scriptPath, type Lang } from "../lib/sections.ts";
import { splitParagraphs, splitSentences } from "../lib/text.ts";

import type { MediaCuesFile } from "../lib/cues.ts";

interface HandoffMedia {
  at: number;
  img: string;
  cap: string;
}
interface HandoffSection {
  subs: string[];
  media: HandoffMedia[];
}

const STOP = new Set(
  "the a an and of in on at to for with from by is was were be been it its this that these those as his her their they he she we you your our not no but or so".split(" "),
);

function keywords(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[’']/g, " ")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 3 && !STOP.has(w)),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return a.size ? n / a.size : 0;
}

function firstWords(s: string, n = 6): string {
  return s.split(/\s+/).slice(0, n).join(" ");
}

function sentenceTable(lang: Lang, sectionIndex: number) {
  const section = SECTIONS[sectionIndex]!;
  const paragraphs = splitParagraphs(readFileSync(scriptPath(section, lang), "utf8"));
  return paragraphs.map((p) => splitSentences(p).map((s) => s.text));
}

async function main() {
  const handoff = (await import(pathToFileURL(resolve(PATHS.handoffDir, "tour-content.js")).href)) as { CONTENT: HandoffSection[] };
  const captions = JSON.parse(readFileSync(resolve(PATHS.configDir, "captions.pdf.json"), "utf8")) as Record<string, { en: string; fr: string }>;
  // Hand overrides survive re-runs: { "<section id>": { "<img>": { "paragraph": n, "sentence": k } } }
  const overridesPath = resolve(PATHS.configDir, "media-cues.overrides.json");
  const overrides = existsSync(overridesPath)
    ? (JSON.parse(readFileSync(overridesPath, "utf8")) as Record<string, Record<string, { paragraph: number; sentence: number }>>)
    : {};

  const out: Record<Lang, MediaCuesFile> = { en: {}, fr: {} };
  const report: string[] = ["# Photo cue re-anchoring", "", "score = share of the handoff sentence's keywords found in the chosen script paragraph (order of cues is enforced).", ""];
  let low = 0;

  for (const section of SECTIONS) {
    const content = handoff.CONTENT[section.index]!;
    const tables = { en: sentenceTable("en", section.index), fr: sentenceTable("fr", section.index) };
    if (tables.en.length !== tables.fr.length) {
      report.push(`> WARNING ${section.id}: EN has ${tables.en.length} paragraphs, FR ${tables.fr.length}`);
    }
    out.en[section.id] = [];
    out.fr[section.id] = [];
    report.push(`## ${section.id}`, "");
    if (content.media.length === 0) {
      report.push("_no photos_", "");
      continue;
    }
    report.push("| photo | handoff sentence (`at`) | EN anchor (para/sent, paragraph score) | FR anchor | caption EN (handoff) | caption FR (PDF) |", "|---|---|---|---|---|---|");

    // 1) paragraph-level scores for every cue, 2) monotonic assignment (cues
    //    appear in script order) maximising the total score, 3) best sentence
    //    inside the chosen paragraph. Greedy matching cascaded badly when one
    //    cue jumped ahead; the DP keeps a single bad cue from dragging the rest.
    const cues = content.media.map((m) => ({ m, kw: keywords(content.subs[m.at] ?? "") }));
    const paraKw = tables.en.map((sentences) => keywords(sentences.join(" ")));
    const P = paraKw.length;
    const score = cues.map(({ kw }) => paraKw.map((pk) => overlap(kw, pk)));
    const dp: number[][] = cues.map(() => new Array<number>(P).fill(-Infinity));
    const prev: number[][] = cues.map(() => new Array<number>(P).fill(-1));
    for (let p = 0; p < P; p++) dp[0]![p] = score[0]![p]!;
    for (let c = 1; c < cues.length; c++) {
      let bestPrev = -Infinity;
      let bestIdx = -1;
      for (let p = 0; p < P; p++) {
        if (dp[c - 1]![p]! > bestPrev) {
          bestPrev = dp[c - 1]![p]!;
          bestIdx = p;
        }
        dp[c]![p] = bestPrev + score[c]![p]!;
        prev[c]![p] = bestIdx;
      }
    }
    const chosen = new Array<number>(cues.length);
    let pBest = 0;
    for (let p = 1; p < P; p++) if (dp[cues.length - 1]![p]! > dp[cues.length - 1]![pBest]!) pBest = p;
    for (let c = cues.length - 1; c >= 0; c--) {
      chosen[c] = pBest;
      pBest = prev[c]![pBest]!;
    }

    cues.forEach(({ m, kw }, c) => {
      const img = m.img.replace(/^photos\//, "").replace(/\.png$/, "");
      const target = content.subs[m.at] ?? "";
      const ov = overrides[section.id]?.[img];
      const p = ov ? ov.paragraph : chosen[c]!;
      const sentences = tables.en[p]!;
      const capKw = keywords(m.cap);
      let sBest = 0;
      let sScore = -1;
      sentences.forEach((sentence, s) => {
        const skw = keywords(sentence);
        // the caption says what the photo shows: prefer the sentence that names it
        const sc = overlap(kw, skw) + 0.5 * overlap(capKw, skw);
        if (sc > sScore) {
          sScore = sc;
          sBest = s;
        }
      });
      if (ov) sBest = ov.sentence;
      const pScore = ov ? 1 : score[c]![p]!;
      if (pScore < 0.5) low++;

      const enSentence = sentences[sBest]!;
      const frPara = tables.fr[p] ?? tables.fr[tables.fr.length - 1]!;
      const frSentence = frPara[Math.min(sBest, frPara.length - 1)]!;
      const capFr = (captions[img]?.fr ?? "").split(/(?<=[.!?])\s+(?=\p{Lu}|«)/u)[0] ?? "";

      out.en[section.id]!.push({ img, cap: m.cap, anchor: { paragraph: p, startsWith: firstWords(enSentence) } });
      out.fr[section.id]!.push({ img, cap: capFr, anchor: { paragraph: p, startsWith: firstWords(frSentence) } });

      const flag = ov ? " (override)" : pScore < 0.5 ? " **LOW**" : "";
      report.push(
        `| ${img} | ${target} | ${p}/${sBest} (${pScore.toFixed(2)})${flag}: ${enSentence} | ${frSentence} | ${m.cap} | ${capFr || "**MISSING**"} |`,
      );
    });
    report.push("");
  }

  for (const lang of LANGS) {
    const file = resolve(PATHS.configDir, `media-cues.${lang}.json`);
    writeFileSync(file, JSON.stringify(out[lang], null, 2) + "\n");
    console.log(`wrote ${file}`);
  }
  const reportDir = resolve(PATHS.outputDir, "reports");
  mkdirSync(reportDir, { recursive: true });
  const reportFile = resolve(reportDir, "media-cues.md");
  writeFileSync(reportFile, report.join("\n"));
  console.log(`report: ${reportFile} (${low} low-confidence anchors)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
