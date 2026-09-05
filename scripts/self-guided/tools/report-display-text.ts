/**
 * Review report for the display-text normaliser: lists every "spoken -> shown"
 * rewrite across the 18 scripts, plus the subtitle pieces that stay long.
 *
 *   pnpm tsx scripts/self-guided/tools/report-display-text.ts [--lang en|fr|both]
 *
 * Writes scripts/self-guided/output/reports/display-text.<lang>.md and prints a summary.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "../lib/args.ts";
import { PATHS, SECTIONS, parseLangs, scriptPath } from "../lib/sections.ts";
import { splitLongSentence, splitParagraphs, splitSentences } from "../lib/text.ts";
import { toDisplayText } from "../lib/numbers.ts";

const args = parseArgs();
const reportDir = resolve(PATHS.outputDir, "reports");
mkdirSync(reportDir, { recursive: true });

for (const lang of parseLangs(args.get("lang"))) {
  const lines: string[] = [`# Display text rewrites (${lang})`, ""];
  const counts = new Map<string, number>();
  let sentences = 0;
  let pieces = 0;
  const longPieces: string[] = [];
  const unchangedNumberWords: string[] = [];
  const numberWord =
    lang === "en"
      ? /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)\b/i
      : /\b(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|cents|mille|million|millions|milliard|milliards)\b/i;

  for (const section of SECTIONS) {
    lines.push(`## ${section.id}`, "");
    const paragraphs = splitParagraphs(readFileSync(scriptPath(section, lang), "utf8"));
    for (const p of paragraphs) {
      for (const s of splitSentences(p)) {
        sentences++;
        for (const piece of splitLongSentence(s.text)) {
          pieces++;
          const { text, rewrites } = toDisplayText(piece, lang);
          if (text.length > 170) longPieces.push(`${section.id}: (${text.length}) ${text}`);
          for (const r of rewrites) {
            counts.set(r.from, (counts.get(r.from) ?? 0) + 1);
            lines.push(`- \`${r.from}\` -> **${r.to}**`);
            lines.push(`  - ${text}`);
          }
          if (numberWord.test(text)) unchangedNumberWords.push(`${section.id}: ${text}`);
        }
      }
    }
    lines.push("");
  }
  lines.push("## Subtitle pieces still longer than 170 chars", "", ...longPieces.map((l) => `- ${l}`), "");
  lines.push("## Pieces that still contain number words (kept on purpose or missed?)", "", ...unchangedNumberWords.map((l) => `- ${l}`), "");
  const file = resolve(reportDir, `display-text.${lang}.md`);
  writeFileSync(file, lines.join("\n"));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  console.log(`${lang}: ${sentences} sentences -> ${pieces} subtitle pieces, ${total} rewrites (${counts.size} distinct), ${longPieces.length} pieces > 170 chars, ${unchangedNumberWords.length} pieces still with number words`);
  console.log(`  report: ${file}`);
}
