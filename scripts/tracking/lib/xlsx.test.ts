import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { columnIndex, decodeXml, excelDate, readWorkbook, tableRows } from "./xlsx.ts";
import { DONE, figures, parseWorkbook, validate } from "./workbook.ts";

test("columnIndex maps spreadsheet references to zero-based columns", () => {
  assert.equal(columnIndex("A1"), 0);
  assert.equal(columnIndex("B2"), 1);
  assert.equal(columnIndex("Z10"), 25);
  assert.equal(columnIndex("AA1"), 26);
  assert.equal(columnIndex("BC12"), 54);
});

test("decodeXml handles named and numeric entities", () => {
  assert.equal(decodeXml("Caf&#233; &amp; th&#xe9;&#226;tre"), "Café & théâtre");
  assert.equal(decodeXml("&lt;b&gt;R&#233;alis&#233;&lt;/b&gt;"), "<b>Réalisé</b>");
  assert.equal(decodeXml("&unknown;"), "&unknown;");
});

test("excelDate converts 1900-system serials", () => {
  // Anchors taken from the workbook itself, cross-checked against the dates
  // recorded for the same sessions in the old participants table.
  assert.equal(excelDate(45192), "2023-09-23");
  assert.equal(excelDate(45199), "2023-09-30");
  assert.equal(excelDate(46205), "2026-07-02");
  assert.equal(excelDate(1), "1899-12-31");
});

// Integration: only runs on a machine that has the real workbook.
const WORKBOOK = process.env.PHT_WORKBOOK
  ?? `${process.env.HOME}/Desktop/Paris History Tours/Paris_History_Tours_Suivi.xlsx`;

test("reads the real workbook and agrees with its own Dashboard", { skip: !existsSync(WORKBOOK) }, () => {
  const sheets = readWorkbook(WORKBOOK);
  for (const name of ["Dashboard", "Params", "Reservations", "Sessions", "Contacts"]) {
    assert.ok(sheets.has(name), `sheet ${name} missing`);
  }

  const reservations = tableRows(sheets.get("Reservations")!);
  assert.ok(reservations.length > 300);
  assert.equal(typeof reservations[0]!.booking_id, "string");

  const wb = parseWorkbook(WORKBOOK);
  assert.deepEqual(validate(wb).filter((c) => c.level === "error"), []);

  const f = figures(wb);
  assert.equal(f.participants, wb.dashboard["Participants"]);
  assert.equal(f.tours_conducted, wb.dashboard["Visites réalisées"]);
  assert.ok(Math.abs(f.gross - wb.dashboard["CA brut"]!) < 0.05);
  assert.ok(Math.abs(f.net - wb.dashboard["CA net"]!) < 0.05);
  // Every label resolves, and the UK nations collapse onto one country.
  assert.ok(f.countries <= f.countries_raw);
  assert.ok(wb.reservations.every((r) => !r.pays || r.pays_code));
  assert.ok(wb.reservations.some((r) => r.statut === DONE));
});
