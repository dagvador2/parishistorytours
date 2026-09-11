import { test } from "node:test";
import assert from "node:assert/strict";
import { countryFromLabel } from "../../../src/lib/countries.ts";
import { crossCheck, figures, validate, type Workbook } from "./workbook.ts";

function fixture(overrides: Partial<Workbook> = {}): Workbook {
  const wb: Workbook = {
    file: "fixture.xlsx",
    sessions: [
      { session_id: 1, date: "2024-05-01", date_estimee: false, tour: "Left Bank · WWII", langue: null, statut: "Réalisé", km: 2.5, notes: null },
      { session_id: 2, date: "2024-06-01", date_estimee: false, tour: "Produit digital", langue: null, statut: "Réalisé", km: 0, notes: null },
      { session_id: 3, date: "2024-07-01", date_estimee: true, tour: "Left Bank · WWII", langue: null, statut: "Annulé", km: 0, notes: null },
    ],
    reservations: [
      res("B1", 1, 4, "USA"),
      res("B2", 1, 2, "Ecosse"),
      res("B3", 1, 3, "UK"),
      { ...res("B4", 2, 1, "France"), statut: "Vendu" },
      { ...res("B5", 3, 5, "Italie"), statut: "Annulé" },
    ],
    contacts: [],
    dashboard: { Participants: 9, "Visites réalisées": 1, "CA brut": 0, "CA net": 0 },
  };
  return { ...wb, ...overrides };
}

function res(booking_id: string, session_id: number, pax: number, pays: string) {
  return {
    booking_id, session_id, pax, pays,
    pays_code: countryFromLabel(pays)?.code ?? null,
    contact_id: null, nom_client: null, etat_us: null, canal: "Freetour", apporteur: null,
    modele: "Pourboire", montant_brut: 0, pourboire_cash: 0, commission_pct: 0, frais_pers: 0,
    net: 0, statut: "Réalisé", avis_laisse: false, date_relance_google: null, avis_texte: null, notes: null,
  };
}

test("figures count only completed rows, and exclude the digital product from the tour count", () => {
  const f = figures(fixture());
  assert.equal(f.participants, 9); // B4 is "Vendu", B5 is "Annulé"
  assert.equal(f.tours_conducted, 1); // session 2 is the digital product, session 3 is cancelled
  assert.equal(f.kilometers, 3); // 2.5 rounded, cancelled session contributes nothing
});

test("the United Kingdom is one country however it was typed", () => {
  const f = figures(fixture());
  assert.equal(f.countries, 2); // US + GB
  assert.equal(f.countries_raw, 3); // "USA", "Ecosse", "UK"
});

test("validate rejects duplicates and dangling references", () => {
  const dup = fixture();
  dup.reservations = [...dup.reservations, { ...res("B1", 1, 1, "France") }];
  assert.match(errors(validate(dup)), /duplicate booking_id: B1/);

  const orphan = fixture();
  orphan.reservations = [res("B9", 99, 1, "France")];
  assert.match(errors(validate(orphan)), /unknown session/);

  const ghost = fixture();
  ghost.reservations = [{ ...res("B9", 1, 1, "France"), contact_id: "C404" }];
  assert.match(errors(validate(ghost)), /unknown contact/);
});

test("validate refuses to silently drop a country it cannot map", () => {
  const wb = fixture();
  wb.reservations = [{ ...res("B9", 1, 2, "Wakanda"), pays: "Wakanda", pays_code: null }];
  assert.match(errors(validate(wb)), /Wakanda/);
});

test("crossCheck flags a disagreement with the workbook's own Dashboard", () => {
  const wb = fixture();
  assert.deepEqual(crossCheck(wb, figures(wb)).filter((c) => c.level === "error"), []);
  wb.dashboard["Participants"] = 800;
  assert.match(errors(crossCheck(wb, figures(wb))), /Participants: computed 9, workbook says 800/);
});

function errors(checks: { level: string; message: string }[]): string {
  return checks.filter((c) => c.level === "error").map((c) => c.message).join("\n");
}
