/**
 * Export the narration scripts as a Word document for review and editing:
 * the spoken text verbatim (numbers in letters, as the voice reads them),
 * with every anchored photograph placed where it appears in the narration.
 *
 *   pnpm tsx scripts/self-guided/tools/export-docx.ts [--lang fr|en|both]
 *
 * Paragraph splitting and anchor resolution reuse the pipeline's own helpers,
 * so what the document shows is exactly what the generator will see.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { AlignmentType, Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from "docx";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { loadMediaCues, resolveAnchor, type MediaCue } from "../lib/cues.ts";
import { splitParagraphs, splitSentences } from "../lib/text.ts";
import { PATHS, parseLangs, scriptPath, SECTIONS, type Lang } from "../lib/sections.ts";

const PHOTO_DIR = resolve(PATHS.handoffDir, "photos");
const OUT_DIR = resolve(PATHS.outputDir, "review");
const IMG_WIDTH_PT = 400;

const COPY = {
  fr: {
    title: "Tour autoguidé — Rive Gauche, Seconde Guerre mondiale",
    subtitle: "Texte de la narration, tel qu'il est prononcé",
    intro: [
      "Ce document contient le texte source de l'audio, mot pour mot. Les nombres y sont écrits en toutes lettres : c'est ce qui garantit que la voix les prononce correctement. À l'écran, dans l'application, ils sont réaffichés en chiffres automatiquement — vous n'avez donc pas à les convertir ici.",
      "Chaque photographie est placée juste après le paragraphe où elle apparaît, avec sa légende et la phrase à laquelle elle est accrochée.",
      "Attention : une photo est accrochée aux premiers mots de sa phrase. Si vous modifiez le début d'une phrase signalée « Photo accrochée à », ou si vous ajoutez ou supprimez un paragraphe entier, l'ancrage se décale. Signalez-le simplement, il sera remis à jour.",
    ],
    section: "Section",
    words: "mots",
    minutes: "min",
    caption: "Légende",
    anchor: "Photo accrochée à",
    missing: "(photo introuvable)",
  },
  en: {
    title: "Self-guided tour — Left Bank, Second World War",
    subtitle: "Narration script, exactly as spoken",
    intro: [
      "This document holds the source text of the audio, word for word. Numbers are spelled out in letters: that is what makes the voice read them correctly. On screen, in the app, they are shown back as digits automatically — you do not need to convert them here.",
      "Each photograph sits right after the paragraph where it appears, with its caption and the sentence it is anchored to.",
      "Careful: a photo is anchored to the first words of its sentence. If you change the beginning of a sentence marked “Photo anchored to”, or add or remove a whole paragraph, the anchor shifts. Just flag it and it will be updated.",
    ],
    section: "Section",
    words: "words",
    minutes: "min",
    caption: "Caption",
    anchor: "Photo anchored to",
    missing: "(photo not found)",
  },
} as const;

interface Manifest {
  sections: { id: string; durationSec: number }[];
}

function durations(lang: Lang): Map<string, number> {
  const file = resolve(PATHS.manifestDir, `${lang}.json`);
  if (!existsSync(file)) return new Map();
  const m = JSON.parse(readFileSync(file, "utf8")) as Manifest;
  return new Map(m.sections.map((s) => [s.id, s.durationSec]));
}

/** Downscaled JPEG of a handoff photo, sized for a Word page. */
async function photo(name: string): Promise<{ data: Buffer; width: number; height: number } | null> {
  const file = resolve(PHOTO_DIR, `${name}.png`);
  if (!existsSync(file)) return null;
  const img = sharp(file).rotate();
  const meta = await img.metadata();
  const ratio = (meta.height ?? 1) / (meta.width ?? 1);
  const data = await img.resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
  return { data, width: IMG_WIDTH_PT, height: Math.round(IMG_WIDTH_PT * ratio) };
}

async function build(lang: Lang): Promise<string> {
  const t = COPY[lang];
  const cues = loadMediaCues(lang);
  const dur = durations(lang);
  const children: Paragraph[] = [
    new Paragraph({ text: t.title, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: t.subtitle, italics: true, color: "666666" })], spacing: { after: 240 } }),
    ...t.intro.map((p) => new Paragraph({ children: [new TextRun({ text: p, size: 20, color: "444444" })], spacing: { after: 160 } })),
  ];

  for (const [i, def] of SECTIONS.entries()) {
    const script = readFileSync(scriptPath(def, lang), "utf8");
    const paragraphs = splitParagraphs(script);
    const words = script.split(/\s+/).filter(Boolean).length;
    const seconds = dur.get(def.id);
    const meta = [`${words} ${t.words}`, seconds ? `${Math.round(seconds / 60)} ${t.minutes}` : null].filter(Boolean).join(" · ");

    children.push(
      new Paragraph({ text: "", spacing: { before: 360 } }),
      new Paragraph({ text: `${t.section} ${i + 1} — ${def.id}`, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ children: [new TextRun({ text: meta, size: 18, color: "888888" })], spacing: { after: 200 } }),
    );

    const sectionCues: MediaCue[] = cues[def.id] ?? [];
    for (const [pi, para] of paragraphs.entries()) {
      children.push(new Paragraph({ children: [new TextRun({ text: para, size: 24 })], spacing: { after: 200, line: 320 } }));

      for (const cue of sectionCues.filter((c) => c.anchor.paragraph === pi)) {
        const sentences = splitSentences(para).map((s) => s.text);
        const { index, exact } = resolveAnchor(sentences, cue.anchor.startsWith);
        const img = await photo(cue.img);
        if (img) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 60 },
              children: [new ImageRun({ type: "jpg", data: img.data, transformation: { width: img.width, height: img.height } })],
            }),
          );
        } else {
          children.push(new Paragraph({ children: [new TextRun({ text: `${cue.img} ${t.missing}`, size: 18, color: "AA0000" })] }));
        }
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: `${t.caption} — ${cue.cap}`, size: 18, italics: true, color: "555555" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `${t.anchor} : « ${(sentences[index] ?? "").slice(0, 90)}… »${exact ? "" : "  ⚠"}`,
                size: 16,
                color: exact ? "999999" : "AA0000",
              }),
            ],
          }),
        );
      }
    }
  }

  const doc = new Document({
    creator: "Paris History Tours",
    title: t.title,
    styles: {
      default: {
        document: { run: { font: "Georgia", size: 24 } },
        title: { run: { font: "Georgia", size: 44, bold: false, color: "1C1714" } },
        heading1: { run: { font: "Georgia", size: 30, bold: false, color: "8B0000" }, paragraph: { spacing: { before: 240, after: 80 } } },
      },
    },
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children }],
  });

  mkdirSync(OUT_DIR, { recursive: true });
  const out = resolve(OUT_DIR, `narration-${lang}.docx`);
  writeFileSync(out, await Packer.toBuffer(doc));
  return out;
}

async function main() {
  const args = parseArgs();
  for (const lang of parseLangs(args.get("lang") ?? "fr")) {
    const out = await build(lang);
    log.info("docx", `${lang} -> ${out}`);
  }
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
