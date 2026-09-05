#!/usr/bin/env sh
# Rebuild the offline basemap of the webapp: a PMTiles extract of the Latin
# Quarter from the latest Protomaps planet build (OpenStreetMap data, ODbL).
#
#   brew install pmtiles
#   sh scripts/self-guided/tools/extract-map.sh [YYYYMMDD]
#
# The bbox must contain src/data/self-guided/left-bank-ww2.ts AREA_BOUNDS with
# margin. Zooms below 13 are dropped: the app never zooms out that far and it
# halves the file (~2.6 MB). Glyphs (public/self-guided/map/fonts) come from
# https://protomaps.github.io/basemaps-assets/fonts/ and rarely need updating.
set -e
BUILD="${1:-$(curl -s https://build.protomaps.com/ | grep -o '[0-9]\{8\}\.pmtiles' | sort -u | tail -1 | cut -d. -f1)}"
OUT="$(dirname "$0")/../../../public/self-guided/map/latin-quarter.pmtiles"
echo "Protomaps build $BUILD -> $OUT"
pmtiles extract "https://build.protomaps.com/$BUILD.pmtiles" "$OUT" --bbox=2.3250,48.8380,2.3620,48.8620 --minzoom=13
pmtiles show "$OUT" | head -8
