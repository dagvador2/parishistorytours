/**
 * MapLibre style of the audioguide: Protomaps basemap schema, self-hosted
 * PMTiles extract of the Latin Quarter, sepia "paper map" flavor derived from
 * the design tokens (container bg #EDE7DC, desaturated tiles, no POI icons).
 */
import { layers, namedFlavor, type Flavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";

export const MAP_TILES_URL = "/self-guided/map/latin-quarter.pmtiles";
export const MAP_GLYPHS_URL = "/self-guided/map/fonts/{fontstack}/{range}.pbf";

const paper = "#EDE7DC";
const road = "#FBF8F2";
const roadMajor = "#FFFFFF";
const casing = "#DDD5C6";
const green = "#E2DDC9";
const greenB = "#D8D2BB";
const water = "#D7D2C5";
const building = "#E3DCCE";
const label = "#8A7B6E";
const labelStrong = "#6B5A4E";
const halo = "#F3EEE3";

export const SEPIA: Flavor = {
  ...namedFlavor("light"),
  background: paper,
  earth: paper,
  park_a: green, park_b: greenB, wood_a: green, wood_b: greenB, scrub_a: green, scrub_b: greenB,
  hospital: "#EAE3D6", industrial: "#E8E1D4", school: "#EAE3D6", zoo: green, military: "#E6DFD2",
  pedestrian: "#F1ECE0", glacier: paper, sand: "#EAE4D4", beach: "#EAE4D4", aerodrome: "#E8E1D4", runway: road,
  water,
  pier: casing, buildings: building, railway: "#C9BFB0", boundaries: "#C9BFB0",
  tunnel_other_casing: casing, tunnel_minor_casing: casing, tunnel_link_casing: casing, tunnel_major_casing: casing, tunnel_highway_casing: casing,
  tunnel_other: "#E8E2D6", tunnel_minor: "#E8E2D6", tunnel_link: "#E8E2D6", tunnel_major: "#E8E2D6", tunnel_highway: "#E8E2D6",
  minor_service_casing: casing, minor_casing: casing, link_casing: casing, major_casing_late: casing, highway_casing_late: casing,
  major_casing_early: casing, highway_casing_early: casing,
  other: road, minor_service: road, minor_a: road, minor_b: roadMajor, link: roadMajor, major: roadMajor, highway: roadMajor,
  bridges_other_casing: casing, bridges_minor_casing: casing, bridges_link_casing: casing, bridges_major_casing: casing, bridges_highway_casing: casing,
  bridges_other: road, bridges_minor: roadMajor, bridges_link: roadMajor, bridges_major: roadMajor, bridges_highway: roadMajor,
  roads_label_minor: label, roads_label_minor_halo: halo, roads_label_major: labelStrong, roads_label_major_halo: halo,
  ocean_label: label, subplace_label: labelStrong, subplace_label_halo: halo, city_label: labelStrong, city_label_halo: halo,
  state_label: label, state_label_halo: halo, country_label: label, address_label: label, address_label_halo: halo,
  landcover: {
    grassland: green, barren: "#EAE4D4", urban_area: paper, farmland: green, glacier: paper, scrub: green, forest: greenB,
  },
};

/** Layers that need a sprite (icons) are dropped: no POI pins, no road shields, keeps the map quiet and sprite-free. */
export function buildStyle(lang: "en" | "fr"): StyleSpecification {
  const base = layers("protomaps", SEPIA, { lang }).filter((l) => !(l.layout && "icon-image" in l.layout));
  return {
    version: 8,
    glyphs: MAP_GLYPHS_URL,
    sources: { protomaps: { type: "vector", url: `pmtiles://${MAP_TILES_URL}`, attribution: "© OpenStreetMap" } },
    layers: base as StyleSpecification["layers"],
  };
}
