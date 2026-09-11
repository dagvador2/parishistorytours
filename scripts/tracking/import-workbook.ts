/**
 * Load the tracking workbook into Supabase.
 *
 *   pnpm tracking:import [--file <path.xlsx>] [--dry-run] [--force] [--quiet]
 *
 * The workbook is the source of truth: the three tables are made to match it
 * exactly (rows added, updated, and deleted when they disappear from the file).
 * Re-running it is safe and idempotent.
 *
 * The run aborts before touching anything if the workbook fails validation, or
 * if the figures we compute disagree with the ones Excel cached in its own
 * Dashboard sheet. `--force` downgrades both to warnings.
 *
 * Needs PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env).
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseArgs } from "../self-guided/lib/args.ts";
import { loadEnv, requireEnv } from "../self-guided/lib/env.ts";
import { log } from "../self-guided/lib/log.ts";
import { countryName } from "../../src/lib/countries.ts";
import { KEY_FIGURES_FALLBACK } from "../../src/data/site.ts";
import { crossCheck, figures, parseWorkbook, validate, type Check, type Workbook } from "./lib/workbook.ts";

const WORKBOOK_NAME = "Paris_History_Tours_Suivi.xlsx";

/** Where the workbook usually lives, most specific first. */
function defaultPaths(): string[] {
  return [
    resolve(process.cwd(), "data", WORKBOOK_NAME),
    resolve(homedir(), "Desktop", "Paris History Tours", WORKBOOK_NAME),
    resolve(homedir(), "Desktop", WORKBOOK_NAME),
  ];
}

function locate(explicit: string | undefined): string {
  if (explicit) {
    const file = resolve(explicit.replace(/^~(?=\/)/, homedir()));
    if (!existsSync(file)) throw new Error(`Workbook not found: ${file}`);
    return file;
  }
  const fromEnv = process.env.PHT_WORKBOOK;
  if (fromEnv) return locate(fromEnv);
  for (const candidate of defaultPaths()) if (existsSync(candidate)) return candidate;
  throw new Error(
    `Workbook not found. Looked for:\n  ${defaultPaths().join("\n  ")}\n` +
      `Pass --file <path> or set PHT_WORKBOOK in .env.`,
  );
}

/* ----------------------------------------------------------------- push -- */

const CHUNK = 500;

async function upsert(db: SupabaseClient, table: string, rows: object[], key: string): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await db.from(table).upsert(slice, { onConflict: key });
    if (error) throw new Error(`${table}: upsert failed — ${error.message}`);
  }
}

async function existingKeys(db: SupabaseClient, table: string, key: string): Promise<Set<string>> {
  const out = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(key).range(from, from + 999);
    if (error) throw new Error(`${table}: read failed — ${error.message}`);
    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) out.add(String(row[key]));
    if (!data || data.length < 1000) return out;
  }
}

async function deleteMissing(
  db: SupabaseClient,
  table: string,
  key: string,
  keep: Set<string>,
): Promise<number> {
  const present = await existingKeys(db, table, key);
  const stale = [...present].filter((k) => !keep.has(k));
  for (let i = 0; i < stale.length; i += CHUNK) {
    const { error } = await db.from(table).delete().in(key, stale.slice(i, i + CHUNK));
    if (error) throw new Error(`${table}: delete failed — ${error.message}`);
  }
  return stale.length;
}

async function push(db: SupabaseClient, wb: Workbook): Promise<void> {
  const bookingIds = new Set(wb.reservations.map((r) => r.booking_id));
  const sessionIds = new Set(wb.sessions.map((s) => String(s.session_id)));
  const contactIds = new Set(wb.contacts.map((c) => c.contact_id));

  // Reservations go first on the way out and last on the way in: they hold the
  // foreign keys to the other two tables.
  const goneBookings = await deleteMissing(db, "tour_reservations", "booking_id", bookingIds);
  log.info("push", `tour_reservations: ${goneBookings} stale row(s) removed`);

  await upsert(db, "tour_contacts", wb.contacts, "contact_id");
  log.info("push", `tour_contacts: ${wb.contacts.length} row(s) written`);

  await upsert(db, "tour_sessions", wb.sessions, "session_id");
  log.info("push", `tour_sessions: ${wb.sessions.length} row(s) written`);

  await upsert(db, "tour_reservations", wb.reservations, "booking_id");
  log.info("push", `tour_reservations: ${wb.reservations.length} row(s) written`);

  const goneSessions = await deleteMissing(db, "tour_sessions", "session_id", sessionIds);
  const goneContacts = await deleteMissing(db, "tour_contacts", "contact_id", contactIds);
  log.info("push", `tour_sessions: ${goneSessions} stale row(s) removed`);
  log.info("push", `tour_contacts: ${goneContacts} stale row(s) removed`);
}

/* ----------------------------------------------------------------- main -- */

function report(scope: string, checks: Check[]): number {
  let errors = 0;
  for (const c of checks) {
    if (c.level === "error") {
      errors++;
      log.error(scope, c.message);
    } else {
      log.warn(scope, c.message);
    }
  }
  return errors;
}

async function main(): Promise<void> {
  const args = parseArgs();
  loadEnv();

  const file = locate(args.get("file"));
  log.step(`Tracking import — ${file}`);

  const wb = parseWorkbook(file);
  log.info("read", `${wb.sessions.length} sessions, ${wb.reservations.length} reservations, ${wb.contacts.length} contacts`);

  const f = figures(wb);
  let errors = report("validate", validate(wb));
  errors += report("crosscheck", crossCheck(wb, f));

  log.step("Published figures");
  console.log(`  Participants          ${f.participants}`);
  console.log(`  Visites réalisées     ${f.tours_conducted}`);
  console.log(`  Kilomètres parcourus  ${f.kilometers}`);
  console.log(`  Pays représentés      ${f.countries}${
    f.countries_raw !== f.countries ? `  (${f.countries_raw} labels in the workbook, merged into ${f.countries} countries)` : ""
  }`);
  console.log(`  CA brut / net         ${f.gross.toFixed(2)} € / ${f.net.toFixed(2)} €   (not published)`);

  const top = new Map<string, number>();
  for (const r of wb.reservations) {
    if (r.statut !== "Réalisé" || !r.pays_code) continue;
    top.set(r.pays_code, (top.get(r.pays_code) ?? 0) + r.pax);
  }
  const ranking = [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`  Top 5 pays            ${ranking.map(([c, n]) => `${countryName(c, "fr")} ${n}`).join(" · ")}`);

  // The site renders this snapshot when Supabase is unreachable, so it should
  // not drift far from the real numbers.
  const drift = [
    ["participants", f.participants, KEY_FIGURES_FALLBACK.participants],
    ["toursConducted", f.tours_conducted, KEY_FIGURES_FALLBACK.toursConducted],
    ["kilometers", f.kilometers, KEY_FIGURES_FALLBACK.kilometers],
    ["countries", f.countries, KEY_FIGURES_FALLBACK.countries],
  ] as const;
  const stale = drift.filter(([, live, snapshot]) => live !== snapshot);
  if (stale.length) {
    log.warn(
      "site",
      `KEY_FIGURES_FALLBACK in src/data/site.ts is out of date: ${stale
        .map(([name, live, snapshot]) => `${name} ${snapshot} → ${live}`)
        .join(", ")}`,
    );
  }

  if (errors) {
    if (!args.has("force")) {
      log.error("abort", `${errors} blocking problem(s) — nothing was written. Fix the workbook, or re-run with --force.`);
      process.exitCode = 1;
      return;
    }
    log.warn("force", `${errors} problem(s) ignored because --force was passed`);
  }

  if (args.has("dry-run")) {
    log.info("dry-run", "nothing written");
    return;
  }

  log.step("Writing to Supabase");
  const db = createClient(requireEnv("PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  await push(db, wb);

  const { data: stats, error } = await db.from("public_tour_stats").select("*").single();
  if (error) throw new Error(`public_tour_stats: ${error.message}`);
  log.step("Live on the site");
  console.log(`  ${JSON.stringify(stats)}`);
}

main().catch((err: unknown) => {
  log.error("fatal", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
