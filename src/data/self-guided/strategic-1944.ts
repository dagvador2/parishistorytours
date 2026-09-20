/**
 * The strategic picture of the summer of 1944, as the player draws it.
 *
 * The narration states the whole thing in two sentences — the Allies have
 * landed in Normandy, the objective is Berlin, and Paris happens to sit on the
 * road between the two — and then spends a paragraph on why that is a problem:
 * a liberated capital has to be fed, which costs men, fuel and food, so the
 * American generals would rather go round it. It had a still for that
 * (`n48_carte_normandie_berlin`, `tools/make-strategic-map.ts`), which said the
 * first half and could not say the second.
 *
 * So it is a live map now, like the May 1940 one: each arrow draws itself at
 * the second it is spoken, the supply pills land on the words "des hommes, de
 * l'essence, de la nourriture", and the dashed arrow round Paris appears when
 * the generals decide to bypass it. Same renderer, same audio clock, same
 * pause-and-seek behaviour (`campaign-map.ts`, `campaignScene.ts`).
 */
import type { CampaignGeography, City, Move } from "./campaign-map";
import { INK } from "./campaign-map";
import type { LatLng } from "./left-bank-ww2";

/**
 * Frame of the map, in degrees — the window of the still it replaces, opened
 * out east and west. The well crops the sides (`object-fit: cover`) and
 * Normandy and Berlin sit on them, so both need country to spare.
 */
export const STRATEGIC_AREA = { lonMin: -5.4, lonMax: 18.6, latMin: 45.2, latMax: 55.4 };
export const STRATEGIC_ZOOM = 5;

/** Corners of that window, for `buildMapCanvas({ points })`. */
export const STRATEGIC_CORNERS: LatLng[] = [
  [STRATEGIC_AREA.latMin, STRATEGIC_AREA.lonMin],
  [STRATEGIC_AREA.latMax, STRATEGIC_AREA.lonMax],
];

// --------------------------------------------------------------- the arrows

/** The beaches, the breakout, and east towards the capital. */
const FROM_NORMANDY: LatLng[] = [[49.34, -0.62], [48.95, 0.35], [48.80, 1.45], [48.86, 2.25]];
/** On east from Paris to Berlin — the objective, not yet a route taken. */
const TO_BERLIN: LatLng[] = [[48.95, 2.6], [49.60, 5.2], [50.40, 8.4], [51.60, 11.2], [52.45, 13.05]];
/** What the American generals wanted: round the south of Paris and carry on. */
const AROUND_PARIS: LatLng[] = [[48.72, 1.97], [48.21, 2.83], [48.04, 4.20], [48.32, 5.57], [48.72, 6.60]];

export const STRATEGIC_MOVES: Move[] = [
  {
    id: "landed", phase: 1, pts: FROM_NORMANDY, colour: INK.green, width: 11, draw: 2.6,
    chip: { pos: [51.94, -0.43], text: "juin 1944", colour: INK.green },
    legend: { colour: INK.green, text: { fr: "L'avance alliée depuis la Normandie", en: "The Allied advance from Normandy" } },
    banner: {
      title: { fr: "Été 1944 — les Alliés ont débarqué", en: "Summer 1944 — the Allies have landed" },
      sub: { fr: "L'armée allemande a perdu l'avantage", en: "The German army has lost the upper hand" },
    },
  },
  {
    id: "berlin", phase: 1, pts: TO_BERLIN, colour: INK.green, width: 10, dash: true, draw: 3.2,
    legend: { colour: INK.green, dash: true, text: { fr: "L'objectif : Berlin", en: "The objective: Berlin" } },
    banner: {
      title: { fr: "L'objectif est Berlin", en: "The objective is Berlin" },
      sub: { fr: "Y arriver, c'est mettre fin à la guerre", en: "Reaching it ends the war" },
    },
  },
  // No arrow and no pill: the banner cuts, and the red dot on PARIS — drawn
  // from the first frame — is suddenly what the map is about.
  {
    id: "paris", phase: 2,
    banner: {
      title: { fr: "Mais Paris est sur la route", en: "But Paris is on the road" },
      sub: { fr: "Entre la Normandie et Berlin, la capitale", en: "Between Normandy and Berlin, the capital" },
    },
  },
  {
    id: "question", phase: 2,
    quote: {
      pos: [50.60, 16.00],
      lines: {
        fr: ["« Faut-il libérer Paris", "tout de suite ? »"],
        en: ["“Do we liberate Paris", "right now?”"],
      },
    },
  },
  { id: "question_out", phase: 3, hides: "question" },
  {
    id: "supply_men", phase: 3, chip: { pos: [48.21, 0.78], text: "des hommes", colour: INK.black },
    banner: {
      title: { fr: "Logistiquement, un cauchemar", en: "Logistically, a nightmare" },
      sub: { fr: "Une capitale libérée, il faut l'approvisionner", en: "A liberated capital has to be supplied" },
    },
  },
  { id: "supply_fuel", phase: 3, chip: { pos: [47.23, 1.03], text: "de l'essence", colour: INK.black } },
  { id: "supply_food", phase: 3, chip: { pos: [46.23, 1.38], text: "de la nourriture", colour: INK.black } },
  {
    // 2.2 s, not the 2.8 the others take: the cue has 35.4 s and this beat lands
    // at 32.5 — the arrow has to finish before the map leaves the screen.
    id: "bypass", phase: 4, pts: AROUND_PARIS, colour: INK.red, width: 10, dash: true, draw: 2.2,
    legend: { colour: INK.red, dash: true, text: { fr: "Contourner Paris, dans un premier temps", en: "Bypass Paris, for now" } },
    banner: {
      title: { fr: "Les généraux américains veulent passer à côté", en: "The American generals want to go round" },
      sub: { fr: "Paris attendra — c'est trop de temps perdu", en: "Paris can wait — it costs too much time" },
    },
  },
];

// ---------------------------------------------------------------- the place

// Every label is centred over its dot rather than set beside it: the well
// crops a seventh of the width on each side, and Normandy and Berlin sit close
// enough to the edges that a label running outwards would lose its first
// letters on a handset.
export const STRATEGIC_CITIES: City[] = [
  { name: "NORMANDIE", pos: [49.34, -0.62], dy: -18 },
  { name: "PARIS", pos: [48.857, 2.352], dx: 22, dy: 12, main: true },
  { name: "BERLIN", pos: [52.52, 13.40], dy: -18 },
];

export const STRATEGIC_GEO: CampaignGeography = {
  moves: STRATEGIC_MOVES,
  cities: STRATEGIC_CITIES,
  labels: [],
};
