/**
 * The German offensive of May 1940, as the player draws it.
 *
 * Geography only — every coordinate comes from the animation this replaces
 * (`tools/make-map-animation.ts`, now gone) and is unchanged: the arrows were
 * right, it was the playback that was wrong. Four pre-rendered WebP loops ran
 * on their own clock, kept going when the audio paused, ignored a seek and
 * restarted mid-sentence; and a loop cannot stop, so the one story had to be
 * cut into four files that each began again from nothing.
 *
 * Here it is one continuous map instead. Each arrow is a `Move`; the manifest
 * says at which second of the cue it is spoken (resolved from the narration
 * itself, see `generate-audio.ts` → `buildCampaign`), and the player advances
 * it on the audio clock. Nothing ever redraws: once an arrow is up it stays,
 * fading back as the next phase takes the eye.
 *
 * Only the geography is here; the shapes it is built from — and the renderer —
 * are shared with the 1944 map (`campaign-map.ts`, `strategic-1944.ts`).
 */
import type { CampaignGeography, City, GroundLabel, Move } from "./campaign-map";
import { INK } from "./campaign-map";
import type { LatLng } from "./left-bank-ww2";

export { INK };

/** Frame of the map, in degrees. Same window as the animation it replaces. */
export const OFFENSIVE_AREA = { lonMin: 0.4, lonMax: 7.8, latMin: 48.08, latMax: 51.85 };
export const OFFENSIVE_ZOOM = 7;

/** Corners of that window, for `buildMapCanvas({ points })`. */
export const OFFENSIVE_CORNERS: LatLng[] = [
  [OFFENSIVE_AREA.latMin, OFFENSIVE_AREA.lonMin],
  [OFFENSIVE_AREA.latMax, OFFENSIVE_AREA.lonMax],
];

// --------------------------------------------------------------- the arrows

const NL: LatLng[] = [[51.45, 7.1], [51.55, 6.2], [51.62, 5.5], [51.64, 5.0]];
const BE: LatLng[] = [[50.9, 7.3], [50.9, 6.1], [50.85, 5.0], [50.85, 4.45]];
const FR_N: LatLng[] = [[48.95, 2.6], [49.6, 3.2], [50.2, 3.7], [50.75, 4.2]];
/** Phase 2, first half: through the forest the French called impassable. */
const ARD_FOREST: LatLng[] = [[49.95, 7.0], [50.05, 6.2], [50.05, 5.4]];
/** Second half: down onto the Meuse and across it at Sedan. */
const ARD_MEUSE: LatLng[] = [[50.05, 5.4], [49.85, 5.1], [49.70, 4.94]];
/** 15 May: the breach runs west to Laon, ~150 km from Paris — not to the coast. */
const BREAK: LatLng[] = [[49.70, 4.94], [49.66, 4.48], [49.60, 4.02], [49.57, 3.66]];
/** The road that lay open from Laon — and that they did not take. */
const TO_PARIS: LatLng[] = [[49.56, 3.62], [49.35, 3.25], [49.10, 2.80], [48.92, 2.45]];
/** 16 May: the turn north-west, to trap the Allied armies against the Channel. */
const COAST: LatLng[] = [[49.56, 3.62], [49.95, 3.28], [50.45, 2.92], [50.95, 2.45]];

export const OFFENSIVE_MOVES: Move[] = [
  {
    id: "nl", phase: 1, pts: NL, colour: INK.black, width: 10, draw: 2.4,
    chip: { pos: [51.16, 6.24], text: "10 mai", colour: INK.black },
    legend: { colour: INK.black, text: { fr: "10 mai — Belgique, Pays-Bas", en: "10 May — Belgium, Netherlands" } },
    banner: {
      title: { fr: "10 mai 1940 — Phase 1", en: "10 May 1940 — Phase 1" },
      sub: { fr: "L'attaque passe par la Belgique et les Pays-Bas", en: "The attack comes through Belgium and the Netherlands" },
    },
  },
  { id: "be", phase: 1, pts: BE, colour: INK.black, width: 10, draw: 2.4 },
  {
    id: "gamelin", phase: 1,
    inset: { caption: { fr: "Général Maurice Gamelin", en: "General Maurice Gamelin" } },
  },
  { id: "gamelin_out", phase: 1, hides: "gamelin" },
  {
    id: "fr_n", phase: 1, pts: FR_N, colour: INK.blue, width: 9, draw: 2.8,
    legend: { colour: INK.blue, text: { fr: "Gamelin monte au nord", en: "Gamelin moves north" } },
  },
  {
    id: "ard", phase: 2, pts: ARD_FOREST, colour: INK.red, width: 12, draw: 2.6,
    chip: { pos: [50.49, 6.24], text: "13 mai", colour: INK.red },
    legend: { colour: INK.red, text: { fr: "13 mai — les Ardennes", en: "13 May — the Ardennes" } },
    banner: {
      title: { fr: "13 mai — Phase 2", en: "13 May — Phase 2" },
      sub: { fr: "Par les Ardennes, déclarées infranchissables", en: "Through the Ardennes, declared impassable" },
    },
  },
  { id: "meuse", phase: 2, pts: ARD_MEUSE, colour: INK.red, width: 12, draw: 2.2 },
  { id: "break", phase: 2, pts: BREAK, colour: INK.red, width: 12, draw: 2.4 },
  {
    id: "to_paris", phase: 3, pts: TO_PARIS, colour: INK.red, width: 9, dash: true, draw: 2.6,
    legend: { colour: INK.red, dash: true, text: { fr: "Route de Paris, non prise", en: "Road to Paris, not taken" } },
    banner: {
      title: { fr: "15 mai — la route de Paris est ouverte", en: "15 May — the road to Paris is open" },
      sub: { fr: "La percée atteint Laon, à moins de 150 km de la capitale", en: "The breach reaches Laon, under 150 km from the capital" },
    },
  },
  { id: "call", phase: 3, chip: { pos: [49.38, 2.00], text: "15 mai, 6 h", colour: INK.red } },
  {
    id: "quote", phase: 3,
    quote: {
      pos: [49.50, 6.35],
      lines: {
        fr: ["« Tout est perdu. »", "Le ministre de la Défense à Paul Reynaud"],
        en: ["“All is lost.”", "The Minister of Defence to Paul Reynaud"],
      },
    },
  },
  { id: "quote_out", phase: 3, hides: "quote" },
  {
    id: "coast", phase: 4, pts: COAST, colour: INK.red, width: 12, draw: 2.8,
    chip: { pos: [50.64, 1.97], text: "16 mai", colour: INK.red },
    legend: { colour: INK.red, text: { fr: "16 mai — vers la côte", en: "16 May — for the coast" } },
    banner: {
      title: { fr: "16 mai — ils ne vont pas sur Paris", en: "16 May — they are not coming for Paris" },
      sub: { fr: "Le virage vers la côte, pour piéger les armées alliées", en: "The turn for the coast, to trap the Allied armies" },
    },
  },
];

// ---------------------------------------------------------------- the place

export const OFFENSIVE_CITIES: City[] = [
  { name: "PARIS", pos: [48.857, 2.352], dx: 24, dy: 10, main: true },
  { name: "Sedan", pos: [49.70, 4.94], dx: 22, dy: 5 },
  { name: "Dunkerque", pos: [51.03, 2.38], dy: -14 },
  { name: "Bruxelles", pos: [50.85, 4.35], dy: -14 },
  { name: "Laon", pos: [49.56, 3.62], dx: 20, dy: 6 },
];

export const ARDENNES_LABEL: GroundLabel = {
  pos: [50.05, 5.45],
  text: { fr: "Ardennes", en: "Ardennes" },
};

export const OFFENSIVE_GEO: CampaignGeography = {
  moves: OFFENSIVE_MOVES,
  cities: OFFENSIVE_CITIES,
  labels: [ARDENNES_LABEL],
};
