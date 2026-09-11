/**
 * Minimal read-only .xlsx reader — no dependency.
 *
 * Node ships zlib but no ZIP reader, so this walks the archive's central
 * directory itself and inflates each entry, then scans the SpreadsheetML for
 * cell values. Formulas are ignored: Excel caches every result in the file, and
 * the cached value is what we import.
 *
 * Deliberately narrow: shared/inline strings, numbers, booleans, the 1900 date
 * system. Anything outside that (ZIP64 archives, encryption) throws rather than
 * returning silently wrong data.
 */
import { inflateRawSync } from "node:zlib";
import { readFileSync } from "node:fs";

export type CellValue = string | number | boolean | null;

export interface Sheet {
  name: string;
  /** Row-major, gaps filled with null. Row 0 is the first row of the sheet. */
  rows: CellValue[][];
}

/* ------------------------------------------------------------------ ZIP -- */

function readZip(file: string): Map<string, Buffer> {
  const buf = readFileSync(file);
  // End of central directory: scan backwards, the comment is at most 64 KB.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error(`${file}: not a ZIP archive (no end-of-central-directory record)`);
  const entryCount = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  if (offset === 0xffffffff || entryCount === 0xffff) {
    throw new Error(`${file}: ZIP64 archives are not supported`);
  }

  const out = new Map<string, Buffer>();
  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`${file}: corrupt central directory at byte ${offset}`);
    }
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString("utf8", offset + 46, offset + 46 + nameLen);
    offset += 46 + nameLen + extraLen + commentLen;

    if (buf.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`${file}: corrupt local header for ${name}`);
    }
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const data = buf.subarray(start, start + compressedSize);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data));
    else throw new Error(`${file}: unsupported compression method ${method} for ${name}`);
  }
  return out;
}

/* ------------------------------------------------------------------ XML -- */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeXml(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (whole, ent: string) => {
    if (ent.startsWith("#x") || ent.startsWith("#X")) return String.fromCodePoint(parseInt(ent.slice(2), 16));
    if (ent.startsWith("#")) return String.fromCodePoint(parseInt(ent.slice(1), 10));
    return ENTITIES[ent] ?? whole;
  });
}

/** "BC12" -> 54 (0-based column index). */
export function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

/** Concatenate every <t> inside a fragment (shared strings use runs). */
function textOf(fragment: string): string {
  let out = "";
  for (const m of fragment.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t\s*\/>/g)) out += decodeXml(m[1] ?? "");
  return out;
}

function sharedStrings(zip: Map<string, Buffer>): string[] {
  const xml = zip.get("xl/sharedStrings.xml")?.toString("utf8");
  if (!xml) return [];
  // Drop phonetic hints, which would otherwise be concatenated into the value.
  const clean = xml.replace(/<rPh[\s\S]*?<\/rPh>/g, "");
  return [...clean.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]!));
}

function parseSheet(xml: string, strings: string[]): CellValue[][] {
  const rows: CellValue[][] = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>|<row[^>]*\/>/g)) {
    const body = rowMatch[1] ?? "";
    const cells: CellValue[] = [];
    for (const cell of body.matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1]!;
      const inner = cell[2] ?? "";
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /t="([^"]+)"/.exec(attrs)?.[1] ?? "n";
      const col = ref ? columnIndex(ref) : cells.length;
      let value: CellValue = null;
      if (type === "inlineStr") {
        value = textOf(inner) || null;
      } else {
        const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        if (raw !== undefined) {
          if (type === "s") value = strings[Number(raw)] ?? null;
          else if (type === "b") value = raw === "1";
          else if (type === "str" || type === "e") value = decodeXml(raw);
          else {
            const num = Number(raw);
            value = Number.isNaN(num) ? decodeXml(raw) : num;
          }
        }
      }
      while (cells.length < col) cells.push(null);
      cells[col] = value === "" ? null : value;
    }
    rows.push(cells);
  }
  return rows;
}

/* ----------------------------------------------------------------- read -- */

export function readWorkbook(file: string): Map<string, Sheet> {
  const zip = readZip(file);
  const workbook = zip.get("xl/workbook.xml")?.toString("utf8");
  if (!workbook) throw new Error(`${file}: not an .xlsx workbook (xl/workbook.xml missing)`);
  const relsXml = zip.get("xl/_rels/workbook.xml.rels")?.toString("utf8") ?? "";
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship\s([^>]*)\/>/g)) {
    const id = /Id="([^"]+)"/.exec(m[1]!)?.[1];
    const target = /Target="([^"]+)"/.exec(m[1]!)?.[1];
    if (id && target) rels.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
  }

  const strings = sharedStrings(zip);
  const sheets = new Map<string, Sheet>();
  for (const m of workbook.matchAll(/<sheet\s([^>]*)\/>/g)) {
    const attrs = m[1]!;
    const name = decodeXml(/name="([^"]*)"/.exec(attrs)?.[1] ?? "");
    const rid = /r:id="([^"]+)"/.exec(attrs)?.[1] ?? "";
    const path = rels.get(rid);
    const xml = path ? zip.get(path)?.toString("utf8") : undefined;
    if (!xml) throw new Error(`${file}: worksheet "${name}" not found in the archive`);
    sheets.set(name, { name, rows: parseSheet(xml, strings) });
  }
  return sheets;
}

/* ---------------------------------------------------------- conversions -- */

/** Excel serial (1900 date system) -> "YYYY-MM-DD". */
export function excelDate(serial: number): string {
  // Serial 1 is 1900-01-01 and Excel keeps the mythical 1900-02-29, which puts
  // day 0 at 1899-12-30 for every date after February 1900 — all of ours.
  const ms = Math.round(serial) * 86_400_000;
  return new Date(Date.UTC(1899, 11, 30) + ms).toISOString().slice(0, 10);
}

/**
 * Read a table sheet (header row + data rows) as records keyed by header.
 * Rows that are entirely empty are dropped.
 */
export function tableRows(sheet: Sheet): Record<string, CellValue>[] {
  const [header, ...body] = sheet.rows;
  if (!header) return [];
  const keys = header.map((h) => (typeof h === "string" ? h.trim() : String(h ?? "")));
  const out: Record<string, CellValue>[] = [];
  for (const row of body) {
    if (row.every((c) => c === null || c === undefined)) continue;
    const rec: Record<string, CellValue> = {};
    keys.forEach((key, i) => {
      if (key) rec[key] = row[i] ?? null;
    });
    out.push(rec);
  }
  return out;
}
