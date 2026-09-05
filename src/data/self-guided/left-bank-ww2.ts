/**
 * Route metadata of the "WWII Left Bank" self-guided tour.
 *
 * Everything the audio manifest does NOT carry: GPS positions, stop kinds,
 * names, the walking polyline. Coordinates come from the design prototype and
 * are APPROXIMATE: edit them here after the field test, nothing else needs
 * to change. Latitude first, longitude second, like Google Maps.
 *
 * `sectionId` is the stable identifier of the narration section in the
 * manifest (`manifest/left-bank-ww2/<lang>.json`, see scripts/self-guided/README.md).
 */

export type StopKind = "intro" | "stop" | "inter";
export type Lang = "en" | "fr";
export type LatLng = [lat: number, lng: number];

export interface Stop {
  /** Manifest section id, never rename. */
  sectionId: string;
  kind: StopKind;
  /** Main-stop number, only for kind "stop". */
  n?: number;
  /** Glyph shown in badges: "S" (start), "1"…"4", "·" (interstop). */
  badge: string;
  pos: LatLng;
  name: Record<Lang, string>;
  place: Record<Lang, string>;
}

export const PRODUCT_ID = "left-bank-ww2";

/** Distance (m) at which the visitor is considered to have arrived. Tune after the field test. */
export const GEOFENCE_RADIUS_M = 25;

/** Average walking speed used for the "≈ 3 min" estimates. */
export const WALK_M_PER_MIN = 80;

export const STOPS: Stop[] = [
  { sectionId: "01-intro",           kind: "intro",       badge: "S", pos: [48.8464, 2.3401], name: { en: "Introduction", fr: "Introduction" }, place: { en: "60 Boulevard Saint-Michel", fr: "60 boulevard Saint-Michel" } },
  { sectionId: "02-context-of-war",  kind: "stop", n: 1,  badge: "1", pos: [48.8467, 2.3404], name: { en: "60 Boulevard Saint-Michel", fr: "60 boulevard Saint-Michel" }, place: { en: "The war in context", fr: "Le contexte de la guerre" } },
  { sectionId: "03-fall-of-paris",   kind: "stop", n: 2,  badge: "2", pos: [48.8489, 2.3373], name: { en: "Palais du Luxembourg", fr: "Palais du Luxembourg" }, place: { en: "The Fall of Paris", fr: "La chute de Paris" } },
  { sectionId: "04-odeon",           kind: "inter",       badge: "·", pos: [48.8501, 2.3386], name: { en: "Théâtre de l’Odéon", fr: "Théâtre de l’Odéon" }, place: { en: "Plaque to Jacques Guierre", fr: "Plaque Jacques Guierre" } },
  { sectionId: "05-resistance",      kind: "stop", n: 3,  badge: "3", pos: [48.8484, 2.3408], name: { en: "Rue Monsieur-le-Prince × Vaugirard", fr: "Rue Monsieur-le-Prince × Vaugirard" }, place: { en: "Resistance — Agnès Humbert", fr: "Résistance — Agnès Humbert" } },
  { sectionId: "06-sorbonne-facade", kind: "inter",       badge: "·", pos: [48.8487, 2.3430], name: { en: "Sorbonne façade", fr: "Façade de la Sorbonne" }, place: { en: "Bullet marks, right column", fr: "Impacts de balles, colonne droite" } },
  { sectionId: "07-observatory",     kind: "inter",       badge: "·", pos: [48.8490, 2.3447], name: { en: "Sorbonne observatory tower", fr: "Tour de l’observatoire" }, place: { en: "", fr: "" } },
  { sectionId: "08-saint-severin",   kind: "inter",       badge: "·", pos: [48.8519, 2.3457], name: { en: "Église Saint-Séverin", fr: "Église Saint-Séverin" }, place: { en: "The barricades", fr: "Les barricades" } },
  { sectionId: "09-liberation",      kind: "stop", n: 4,  badge: "4", pos: [48.8532, 2.3478], name: { en: "Facing Notre-Dame", fr: "Face à Notre-Dame" }, place: { en: "Liberation", fr: "La Libération" } },
];

/** Walking polyline, start to finish. Approximate; ideally replaced by a routed footpath. */
export const ROUTE: LatLng[] = [
  [48.8464, 2.3401], [48.8467, 2.3404], [48.8478, 2.3412], [48.8484, 2.3395], [48.8489, 2.3373],
  [48.8491, 2.3380], [48.8501, 2.3386], [48.8500, 2.3395], [48.8484, 2.3408], [48.8479, 2.3413],
  [48.8486, 2.3424], [48.8487, 2.3430], [48.8484, 2.3445], [48.8490, 2.3447], [48.8505, 2.3452],
  [48.8519, 2.3457], [48.8528, 2.3466], [48.8532, 2.3478],
];

/** Bounding box of the walk with margin, used to fit the map and to pick the offline tile extract. */
export const AREA_BOUNDS: { sw: LatLng; ne: LatLng } = { sw: [48.8420, 2.3300], ne: [48.8580, 2.3560] };

export const REVIEW_URL = "https://maps.app.goo.gl/AGYuzh8jHA9KXv9h8";
export const SITE_URL = "https://www.parishistorytours.com/";
