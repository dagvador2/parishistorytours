/**
 * Measure how far each subtitle sits from the word it is supposed to start on.
 *
 *   pnpm tsx scripts/self-guided/tools/check-drift.ts --lang fr
 *
 * The manifest's `subs[].t` comes from the alignment; this reads it back
 * against output/manifest/<lang>.words.json, which holds every word timestamp,
 * and prints the worst offenders. A phrase that appears twice in a section
 * would fool a naive search, so matching always resumes from the previous
 * match rather than from the start.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { manifestPath, wordsPath, type Manifest, type WordsSidecar } from "../lib/manifest.ts";
import type { Lang } from "../lib/sections.ts";

const letters = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

const args = parseArgs();
const lang = (args.get("lang") ?? "fr") as Lang;
const manifest = JSON.parse(readFileSync(manifestPath(lang), "utf8")) as Manifest;
const sidecar = JSON.parse(readFileSync(wordsPath(lang), "utf8")) as WordsSidecar;

let worst = { id: "", drift: 0, text: "" };
let total = 0, counted = 0;

for (const section of manifest.sections) {
  const words = sidecar.sections[section.id] ?? [];
  let cursor = 0;
  let sectionWorst = 0;
  for (const [k, sub] of section.subs.entries()) {
    // A short subtitle is not a usable needle on its own: "Bien." matches the
    // "bien" that opens "Bienvenue". Borrow from the next subtitle until there
    // is enough context to be unambiguous.
    let needle = letters(sub.text);
    for (let n = k + 1; needle.length < 18 && n < section.subs.length; n++) needle += letters(section.subs[n]!.text);
    needle = needle.slice(0, 28);
    if (needle.length < 6) continue;
    // Walk forward from the last match, joining words until the prefix matches.
    let found = -1;
    for (let i = cursor; i < words.length; i++) {
      // Punctuation-only tokens («, ».) carry no letters: starting a match on
      // one would credit the subtitle with the punctuation's timestamp.
      if (!letters(words[i]!.text)) continue;
      let acc = "";
      for (let j = i; j < words.length && acc.length < needle.length; j++) acc += letters(words[j]!.text);
      const span = Math.min(needle.length, acc.length);
      if (span >= 12 && acc.slice(0, span) === needle.slice(0, span)) { found = i; break; }
    }
    if (found === -1) continue;
    cursor = found;
    const drift = Math.abs(words[found]!.start - sub.t);
    total += drift; counted++;
    if (drift > sectionWorst) sectionWorst = drift;
    if (drift > worst.drift) worst = { id: section.id, drift, text: sub.text.slice(0, 60) };
  }
  log.info(lang, `${section.id.padEnd(20)} worst ${sectionWorst.toFixed(2)} s over ${section.subs.length} subtitles`);
}

log.step(`${counted} subtitles checked — mean ${(total / counted).toFixed(3)} s, worst ${worst.drift.toFixed(2)} s (${worst.id}: "${worst.text}…")`);
if (worst.drift > 1) { log.error("drift", "a subtitle is more than a second off its word"); process.exit(1); }
