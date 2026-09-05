import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { LANGS, SECTIONS, parseLangs, pdfMasterPath, scriptPath, sectionById } from "./sections.ts";
import { parseArgs } from "./args.ts";

test("9 sections with unique, ordered ids", () => {
  assert.equal(SECTIONS.length, 9);
  assert.deepEqual(SECTIONS.map((s) => s.index), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(new Set(SECTIONS.map((s) => s.id)).size, 9);
  for (const s of SECTIONS) assert.match(s.id, /^\d{2}-[a-z-]+$/);
});

test("every narration script and PDF master exists", () => {
  for (const s of SECTIONS) for (const l of LANGS) assert.ok(existsSync(scriptPath(s, l)), scriptPath(s, l));
  for (const l of LANGS) assert.ok(existsSync(pdfMasterPath(l)));
});

test("helpers", () => {
  assert.equal(sectionById("04-odeon").index, 3);
  assert.throws(() => sectionById("nope"));
  assert.deepEqual(parseLangs(undefined), ["en", "fr"]);
  assert.deepEqual(parseLangs("fr"), ["fr"]);
  assert.throws(() => parseLangs("de"));
  const a = parseArgs(["--lang", "en", "--dry-run", "--section=04-odeon"]);
  assert.equal(a.get("lang"), "en");
  assert.ok(a.has("dry-run"));
  assert.equal(a.get("section"), "04-odeon");
});
