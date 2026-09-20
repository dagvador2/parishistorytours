/**
 * What a campaign map is made of.
 *
 * Two of them exist — the German offensive of May 1940 (`offensive-1940.ts`)
 * and the Allied advance of 1944 (`strategic-1944.ts`) — and they are the same
 * drawing with different geography: arrows that draw themselves at the second
 * they are spoken, dated pills, a card that pops open and folds away, a legend
 * that grows upwards and a banner that cuts from phase to phase. The shapes
 * live here so `campaignScene.ts` can render either one, and so a third map
 * needs no new renderer.
 *
 * Shared by the webapp component, the basemap tools and the preview renderer,
 * so none of the three can drift from the others.
 */
import type { Lang, LatLng } from "./left-bank-ww2";

export const INK = {
  black: "#1C1714",
  blue: "#1A4E8A",
  red: "#8B0000",
  /** the Allies, on the 1944 map */
  green: "#2F5D34",
  paper: "#F7F3EC",
  muted: "#6B5A4E",
  hairline: "#C9BCA8",
  credit: "#9C8A7B",
};

export interface Chip {
  /** where the pill is centred */
  pos: LatLng;
  text: string;
  colour: string;
}
export interface LegendRow {
  colour: string;
  text: Record<Lang, string>;
  dash?: boolean;
}
export interface Banner {
  title: Record<Lang, string>;
  sub: Record<Lang, string>;
}

export interface Move {
  /** unique inside its own map; this is what a manifest beat names */
  id: string;
  /**
   * Which wave of the story this belongs to. A move fades back to `DIM` once
   * any move of a higher phase has started — the map keeps everything, but the
   * eye is sent to what is being said.
   */
  phase: number;
  /** an arrow */
  pts?: LatLng[];
  colour?: string;
  width?: number;
  dash?: boolean;
  /** seconds the arrow takes to draw itself */
  draw?: number;
  /** a photo pinned into the frame while it is being spoken about */
  inset?: { caption: Record<Lang, string> };
  /** a quoted line, on paper, near where it was said */
  quote?: { pos: LatLng; lines: Record<Lang, string[]> };
  /** a dated pill that pops where the move happens */
  chip?: Chip;
  /** the legend row this move adds */
  legend?: LegendRow;
  /** the banner this move puts up, replacing the one before it */
  banner?: Banner;
  /** folds away the card of another move (its moment has passed) */
  hides?: string;
}

export interface City { name: string; pos: LatLng; dx?: number; dy?: number; main?: boolean }

/** Drawn from the first frame: it is geography, not an event. */
export interface GroundLabel { pos: LatLng; text: Record<Lang, string> }

/** Everything that makes one map that map, and nothing about its timing. */
export interface CampaignGeography {
  moves: Move[];
  cities: City[];
  labels: GroundLabel[];
}

export const moveById = (geo: CampaignGeography, id: string): Move | undefined =>
  geo.moves.find((m) => m.id === id);
