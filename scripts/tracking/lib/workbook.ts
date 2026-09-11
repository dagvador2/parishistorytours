/**
 * Maps the tracking workbook onto the database model.
 *
 * Everything here is pure: read the sheets, coerce the cells, resolve the
 * country labels, check the workbook against itself. The network lives in
 * import-workbook.ts.
 *
 * Derived columns are deliberately dropped — `Reservations.date` (looked up
 * from the session), `Sessions.pax / ca_brut / ca_net` (summed from the
 * reservations), `Contacts.pays / nb_reservations`. The database recomputes
 * them so the two can never disagree.
 */
import { countryFromLabel } from "../../../src/lib/countries.ts";
import { excelDate, readWorkbook, tableRows, type CellValue, type Sheet } from "./xlsx.ts";

export interface Session {
  session_id: number;
  date: string | null;
  date_estimee: boolean;
  tour: string | null;
  langue: string | null;
  statut: string;
  km: number;
  notes: string | null;
}

export interface Reservation {
  booking_id: string;
  session_id: number;
  contact_id: string | null;
  nom_client: string | null;
  pax: number;
  pays: string | null;
  pays_code: string | null;
  etat_us: string | null;
  canal: string | null;
  apporteur: string | null;
  modele: string | null;
  montant_brut: number;
  pourboire_cash: number;
  commission_pct: number;
  frais_pers: number;
  net: number;
  statut: string;
  avis_laisse: boolean;
  date_relance_google: string | null;
  avis_texte: string | null;
  notes: string | null;
}

export interface Contact {
  contact_id: string;
  prenom: string | null;
  libelle_repertoire: string | null;
  telephone: string | null;
  telephone_2: string | null;
  email: string | null;
  canal_origine: string | null;
  date_repertoire: string | null;
  consentement_marketing: boolean;
  date_consentement: string | null;
  fiabilite_rattachement: string | null;
  notes: string | null;
}

export interface Workbook {
  file: string;
  sessions: Session[];
  reservations: Reservation[];
  contacts: Contact[];
  /** Figures cached by Excel in the Dashboard sheet, used as a cross-check. */
  dashboard: Record<string, number>;
}

export const DONE = "Réalisé";
export const DIGITAL = "Produit digital";

/* ---------------------------------------------------------- coercion  --- */

function text(v: CellValue): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" || s === "-" ? null : s;
}

function num(v: CellValue, decimals = 2): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function bool(v: CellValue): boolean {
  if (typeof v === "boolean") return v;
  const s = text(v)?.toLowerCase();
  return s === "oui" || s === "yes" || s === "true" || s === "1";
}

function date(v: CellValue): string | null {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? excelDate(v) : null;
  const s = text(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y!.length === 2 ? `20${y}` : y!;
    return `${year}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  return null;
}

/* ------------------------------------------------------------- parsing -- */

function requireSheet(sheets: Map<string, Sheet>, name: string, file: string): Sheet {
  const sheet = sheets.get(name);
  if (!sheet) {
    throw new Error(`${file}: sheet "${name}" is missing (found: ${[...sheets.keys()].join(", ")})`);
  }
  return sheet;
}

/** The Dashboard sheet is "label | value" rows; pick up the numeric ones. */
function readDashboard(sheet: Sheet): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of sheet.rows) {
    const label = text(row[0] ?? null);
    const value = row[1];
    if (label && typeof value === "number" && out[label] === undefined) out[label] = value;
  }
  return out;
}

export function parseWorkbook(file: string): Workbook {
  const sheets = readWorkbook(file);

  const sessions: Session[] = tableRows(requireSheet(sheets, "Sessions", file)).map((r) => ({
    session_id: num(r.session_id, 0),
    date: date(r.date ?? null),
    date_estimee: bool(r.date_estimee ?? null),
    tour: text(r.tour ?? null),
    langue: text(r.langue ?? null),
    statut: text(r.statut ?? null) ?? "Inconnu",
    km: num(r.km ?? null),
    notes: text(r.notes ?? null),
  }));

  const reservations: Reservation[] = tableRows(requireSheet(sheets, "Reservations", file)).map((r) => {
    const pays = text(r.pays ?? null);
    return {
      booking_id: text(r.booking_id ?? null) ?? "",
      session_id: num(r.session_id, 0),
      contact_id: text(r.contact_id ?? null),
      nom_client: text(r.nom_client ?? null),
      pax: num(r.pax ?? null, 0),
      pays,
      pays_code: countryFromLabel(pays)?.code ?? null,
      etat_us: text(r.etat_us ?? null),
      canal: text(r.canal ?? null),
      apporteur: text(r.apporteur ?? null),
      modele: text(r.modele ?? null),
      montant_brut: num(r.montant_brut ?? null),
      pourboire_cash: num(r.pourboire_cash ?? null),
      commission_pct: num(r.commission_pct ?? null, 4),
      frais_pers: num(r.frais_pers ?? null),
      net: num(r.net ?? null),
      statut: text(r.statut ?? null) ?? "Inconnu",
      avis_laisse: bool(r.avis_laisse ?? null),
      date_relance_google: date(r.date_relance_google ?? null),
      avis_texte: text(r.avis_texte ?? null),
      notes: text(r.notes ?? null),
    };
  });

  const contacts: Contact[] = tableRows(requireSheet(sheets, "Contacts", file)).map((r) => ({
    contact_id: text(r.contact_id ?? null) ?? "",
    prenom: text(r.prenom ?? null),
    libelle_repertoire: text(r.libelle_repertoire ?? null),
    telephone: text(r.telephone ?? null),
    telephone_2: text(r.telephone_2 ?? null),
    email: text(r.email ?? null),
    canal_origine: text(r.canal_origine ?? null),
    date_repertoire: date(r.date_repertoire ?? null),
    consentement_marketing: bool(r.consentement_marketing ?? null),
    date_consentement: date(r.date_consentement ?? null),
    fiabilite_rattachement: text(r.fiabilite_rattachement ?? null),
    notes: text(r.notes ?? null),
  }));

  const dashboard = readDashboard(requireSheet(sheets, "Dashboard", file));

  return { file, sessions, reservations, contacts, dashboard };
}

/* ---------------------------------------------------------- validation -- */

export interface Check {
  level: "error" | "warning";
  message: string;
}

export function validate(wb: Workbook): Check[] {
  const checks: Check[] = [];
  const err = (message: string) => checks.push({ level: "error", message });
  const warn = (message: string) => checks.push({ level: "warning", message });

  const dupes = (values: (string | number)[], what: string) => {
    const seen = new Set<string | number>();
    const dup = new Set<string | number>();
    for (const v of values) (seen.has(v) ? dup : seen).add(v);
    if (dup.size) err(`duplicate ${what}: ${[...dup].join(", ")}`);
  };
  dupes(wb.sessions.map((s) => s.session_id), "session_id");
  dupes(wb.reservations.map((r) => r.booking_id), "booking_id");
  dupes(wb.contacts.map((c) => c.contact_id), "contact_id");

  if (wb.reservations.some((r) => !r.booking_id)) err("a reservation row has an empty booking_id");
  if (wb.contacts.some((c) => !c.contact_id)) err("a contact row has an empty contact_id");

  const sessionIds = new Set(wb.sessions.map((s) => s.session_id));
  const orphanBookings = wb.reservations.filter((r) => !sessionIds.has(r.session_id));
  if (orphanBookings.length) {
    err(`${orphanBookings.length} reservation(s) point at an unknown session: ${orphanBookings.slice(0, 8).map((r) => r.booking_id).join(", ")}`);
  }

  const contactIds = new Set(wb.contacts.map((c) => c.contact_id));
  const orphanContacts = wb.reservations.filter((r) => r.contact_id && !contactIds.has(r.contact_id));
  if (orphanContacts.length) {
    err(`${orphanContacts.length} reservation(s) point at an unknown contact: ${orphanContacts.slice(0, 8).map((r) => r.booking_id).join(", ")}`);
  }

  // An unmapped country would silently drop out of the published count.
  const unknown = new Map<string, number>();
  for (const r of wb.reservations) {
    if (r.pays && !r.pays_code) unknown.set(r.pays, (unknown.get(r.pays) ?? 0) + 1);
  }
  if (unknown.size) {
    err(
      `country label(s) not in src/lib/countries.ts — add them there, they are excluded from the published count: ` +
        [...unknown.entries()].map(([label, n]) => `"${label}" (${n})`).join(", "),
    );
  }

  const noCountry = wb.reservations.filter((r) => r.statut === DONE && !r.pays).length;
  if (noCountry) warn(`${noCountry} completed reservation(s) have no country`);

  const noDate = wb.sessions.filter((s) => !s.date).length;
  if (noDate) warn(`${noDate} session(s) have no date`);

  const estimated = wb.sessions.filter((s) => s.date_estimee).length;
  if (estimated) warn(`${estimated} session date(s) are flagged as estimated in the workbook`);

  return checks;
}

/* ----------------------------------------------------------- the figures - */

export interface Figures {
  participants: number;
  tours_conducted: number;
  kilometers: number;
  countries: number;
  countries_raw: number;
  gross: number;
  net: number;
}

/** The same arithmetic as the SQL views, run locally so the push can be checked. */
export function figures(wb: Workbook): Figures {
  const done = wb.reservations.filter((r) => r.statut === DONE);
  const doneSessions = wb.sessions.filter((s) => s.statut === DONE);
  return {
    participants: done.reduce((s, r) => s + r.pax, 0),
    tours_conducted: doneSessions.filter((s) => s.tour !== DIGITAL).length,
    kilometers: Math.round(doneSessions.reduce((s, x) => s + x.km, 0)),
    countries: new Set(done.map((r) => r.pays_code).filter(Boolean)).size,
    countries_raw: new Set(done.map((r) => r.pays).filter(Boolean)).size,
    gross: Math.round(wb.reservations.reduce((s, r) => s + r.montant_brut, 0) * 100) / 100,
    net: Math.round(wb.reservations.reduce((s, r) => s + r.net, 0) * 100) / 100,
  };
}

/**
 * Compare what we computed with the values Excel cached in Dashboard. A gap
 * means the parser and the workbook disagree — the import should not proceed.
 */
export function crossCheck(wb: Workbook, f: Figures): Check[] {
  const rows: [string, number, number | undefined, number][] = [
    ["Participants", f.participants, wb.dashboard["Participants"], 0],
    ["Visites réalisées", f.tours_conducted, wb.dashboard["Visites réalisées"], 0],
    ["Kilomètres parcourus", f.kilometers, wb.dashboard["Kilomètres parcourus"], 1],
    ["CA brut", f.gross, wb.dashboard["CA brut"], 0.05],
    ["CA net", f.net, wb.dashboard["CA net"], 0.05],
  ];
  const checks: Check[] = [];
  for (const [label, ours, theirs, tolerance] of rows) {
    if (theirs === undefined) {
      checks.push({ level: "warning", message: `Dashboard has no "${label}" row to cross-check` });
    } else if (Math.abs(ours - theirs) > tolerance) {
      checks.push({ level: "error", message: `${label}: computed ${ours}, workbook says ${theirs.toFixed(2)}` });
    }
  }
  return checks;
}
