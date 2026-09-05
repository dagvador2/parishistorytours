# Handoff: WWII Left Bank — Self-guided audio tour (mobile web app)

## Overview
Mobile web app for **Paris History Tours** (Clément). A visitor buys the "WWII & the French Resistance — Left Bank" self-guided tour and walks 2 km / ~1h30 through 9 stops (intro, 4 main stops, 4 short "interstops"). The app shows a map with the route and pins, guides the visitor to the next stop (distance / walking time / bearing), plays the narration when they arrive, and while playing shows **photos from the printed guide synchronised to the narration**, plus the current sentence as a subtitle. It ends with a completion sheet (review CTA + link to in-person tours).

Languages: EN and FR UI copy are both implemented. Narration script and subtitles exist in **EN only** (from the PDF); FR narration/subtitles are to be produced later (TTS).

## About the design files
Everything in this bundle is a **design reference built in HTML** — a clickable prototype showing intended look and behaviour, not production code. **Recreate it in the target codebase's environment** (React Native / Expo, SwiftUI, Flutter, a PWA in React/Vue/Svelte… — if nothing exists yet, a **PWA** is the recommended choice: works from a QR code after purchase, no store install, background audio via `<audio>` + Media Session API). Use the environment's idiomatic patterns; do not port the prototype's runtime.

The map in the prototype is Leaflet + OpenStreetMap France tiles, tinted by a CSS filter. In production use whatever map SDK fits (MapLibre, Mapbox, Apple/Google Maps) and reproduce the **look** (see Design tokens › Map).

## Fidelity
**High-fidelity.** Colours, typography, spacing, radii and copy are final. Recreate pixel-close at 375×812 (iPhone 13 mini / SE-class) and 390×844; layout must be fluid between ~360 and ~430 px wide and any height ≥ 600 px. The map is a placeholder for the real map SDK; the photos are final (extracted from the PDF).

## Files in this bundle
- `AudioGuide.dc.html` — the whole app (one screen, 4 phases + overlays). Template = markup, `<script data-dc-script>` = logic. Read it for exact styles.
- `V1 Overview.dc.html` — presentation board showing every state side by side (open it in a browser for reference; `support.js` is required next to it).
- `support.js` — prototype runtime, ignore.
- `tour-content.js` — **the content model**: per-section subtitle sentences + photo cues. Port this to JSON.
- `tour-text.txt` — full text of the PDF guide (source of truth for narration).
- `photos/` — 33 PNGs extracted from the PDF, named `p<page>_<n>.png`. Re-export at 2× for retina (`max 1200px wide`, webp) — several are low-res scans, keep `object-fit: cover`.
- `WW2_Left_Bank_Tour_EN_v2.pdf` — the original guide (do not ship it in the app; menu item "Download PDF map" links to a hosted copy).

---

## Data model

### Stops (hard-coded in the prototype, `STOPS` array)
| idx | kind | badge | audio (min) | lat, lng | name EN | subtitle EN |
|---|---|---|---|---|---|---|
| 0 | intro | S | 3 | 48.8464, 2.3401 | Introduction | 60 Boulevard Saint-Michel |
| 1 | stop 1 | 1 | 9 | 48.8467, 2.3404 | 60 Boulevard Saint-Michel | The war in context |
| 2 | stop 2 | 2 | 7 | 48.8489, 2.3373 | Palais du Luxembourg | The Fall of Paris |
| 3 | inter | · | 2 | 48.8501, 2.3386 | Théâtre de l'Odéon | Plaque to Jacques Guierre |
| 4 | stop 3 | 3 | 11 | 48.8484, 2.3408 | Rue Monsieur-le-Prince × Vaugirard | Resistance — Agnès Humbert |
| 5 | inter | · | 2 | 48.8487, 2.3430 | Sorbonne façade | Bullet marks, right column |
| 6 | inter | · | 1 | 48.8490, 2.3447 | Sorbonne observatory tower | — |
| 7 | inter | · | 3 | 48.8519, 2.3457 | Église Saint-Séverin | The barricades |
| 8 | stop 4 | 4 | 8 | 48.8532, 2.3478 | Facing Notre-Dame | Liberation |

FR names are in the `STOPS` array. Coordinates are approximate — **verify on site**. `ROUTE` is an 18-point polyline following the walk (also approximate; ideally replace with a routed footpath). Audio durations are placeholders until real audio exists.

### Narration content (`tour-content.js`)
`CONTENT[idx] = { subs: string[], media: [{ at: <sub index>, img, cap }] }`.
- `subs` — the narration split into sentences/short groups. One is shown at a time as the subtitle.
- `media` — photo cues: `at` = index of the sentence at which the photo appears; the photo stays until the next cue. Sections 0, 3, 5, 6 have no photos → the player shows the "look around you" placeholder.

**Timestamps:** the prototype derives `t` for each sentence from cumulative word count × section duration (`timeline()`). **Replace with real TTS word timestamps**: when generating audio (ElevenLabs / Azure / OpenAI TTS with timestamps), record the start time of each `subs[i]` and store it as `{ t, text }`. Photo cue time = `t` of its `at` sentence. Target JSON shape per section:

```json
{ "audio": "audio/en/02-luxembourg.mp3", "duration": 421.3,
  "subs":  [{ "t": 0.0, "text": "You are standing in front of…" }, …],
  "media": [{ "t": 61.2, "img": "photos/p10_5.webp", "cap": "Paul Reynaud…" }, …] }
```

### Persisted state (localStorage / device)
`phase`, `idx`, `completed`, `elapsed`, `lang`, `gpsDenied`. Restore on launch so a phone lock or reload resumes where the visitor was.

---

## Design tokens

Colours
- Paper (page bg) `#F7F3EC` · Paper-2 (map bg, tinted surfaces) `#EDE7DC` · Hairline `#E4DCD0`
- Ink `#1C1714` · Ink-muted `#6B5A4E` · Ink-on-dark-muted `#C9B8A6` · Disabled/visited pin `#B4A79A`
- Brand red `#8B0000` · Red pressed `#6E0000` · Red-tint text on red `#E8C9C9`
- Gold (current segment) `#C9A24A`
- GPS blue (user dot only) `#1A73E8`
- White `#FFFFFF`; dark player bg `#1C1714`, photo well `#2A2320` / stripes `#302925`
- Scrims `rgba(28,23,20,.45)`

Typography (system fonts, no webfont)
- Serif (titles, stop names, big numerals, subtitles): `Georgia, "Times New Roman", serif`
- Sans (UI): `-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, sans-serif`
- Eyebrow: sans 10–12px, `letter-spacing .08–.12em`, uppercase, weight 600
- Body: sans 13–15px, line-height 1.3–1.5
- Titles: serif 17–19px (player rows), 28px (complete sheet), line-height 1.1–1.25
- Subtitle (expanded player): serif, 21px / 18px (>110 chars) / 16px (>170 chars), line-height 1.35, centred
- Tabular numerals on time labels

Spacing / shape
- Screen padding 16px; row padding 12–14px vertical
- Radii: buttons 8–14px, cards 12–14px, sheets 24px top, pins/FAB 50%
- Hit targets ≥ 44px everywhere
- Shadows: card `0 6px 18px rgba(0,0,0,.28)`; FAB `0 2px 8px rgba(0,0,0,.18)`; play button `0 4px 12px rgba(139,0,0,.35)`; sheet `0 -10px 30px rgba(0,0,0,.25)`

Map
- Tiles desaturated: filter `grayscale(.85) sepia(.22) brightness(1.04) contrast(.95)` on the tile layer, container bg `#EDE7DC`; no zoom control, no attribution overlay (attribute OSM in the menu footer)
- Route: polyline `#8B0000`, weight 3, opacity .6, dashed `1 7`, round caps
- Main-stop pin: 32px circle, bg `#8B0000` (visited `#B4A79A`), 3px white border, serif 700 13px number in `#F7F3EC` (visited shows ✓), shadow `0 2px 6px rgba(0,0,0,.3)`
- Interstop pin: 16px circle, `#F7F3EC` fill + 3px `#8B0000` border (visited: solid `#B4A79A`)
- Next stop gets a `4px` ring `rgba(139,0,0,.28)`
- User dot: 18px, `#1A73E8`, 3px white border, plus an expanding blue pulse ring (`phtDot`: scale .6→2.4, opacity .6→0, 1.8s ease-out infinite)
- Fit bounds to [user, next stop] with padding top-left 50/40, bottom-right 50/90, maxZoom 17; GPS denied or tour complete → fit all stops

---

## Screen layout (single screen, vertical flex)

1. **Header** (bg Paper, bottom hairline, padding `12 12 10 16`): 32px red monogram circle "P" (serif 18px) · title block (serif 17px "WWII Left Bank"; eyebrow 11px `#6B5A4E` "Self-guided · 3 of 9 stops") · 44px hamburger (3 bars 20/20/14 × 2px ink, gap 5; pressed bg `#E4DCD0`, radius 12).
2. **Segmented progress** (padding `0 16 8`, gap 3): 9 bars, 3px tall, radius 2; main stops `flex:3`, others `flex:1`. Done = red, current = gold, upcoming = hairline.
3. **Map** (flex 1). Overlays:
   - GPS-denied banner (top 10, sides 12): dark `#1C1714` pill radius 12, padding 10/12, gold 8px dot, 13px text "Location is off — tap a pin to start its audio.", ghost button "Enable" (1px `rgba(247,243,236,.5)` border, radius 8, 36px).
   - Recenter FAB (right 12, bottom 12): 44px white circle, hairline border, crosshair glyph.
   - **Next-stop card** (walking only; left 12, right 68, bottom 12): dark card radius 14, padding `10 12 10 10`, gap 12. 40px red circle with a white bearing arrow rotated to the stop's bearing (`transition transform .4s`; GPS denied → hollow ring instead). Eyebrow 10px `#C9B8A6` "NEXT · STOP 2"; serif 15px stop name (ellipsis). Right: 20px/700 distance "260 m", 11px "≈ 3 min".
4. **Bottom player** — one of the phases below.

### Phase A — Walking
White bar, top hairline, padding `16 16 22`, row gap 14: 44px `#EDE7DC` circle with 10px blue dot (3px white ring) · serif 17px "Head to Stop 2 — Palais du Luxembourg" + 13px muted "260 m — about 3 minutes walk" · ghost button "I'm here" (hairline border, Paper bg, red 12px/600 text, radius 10, 44px tall). Auto-transitions to B when GPS puts the user within ~25 m of the stop (prototype: button only).

### Phase B — Arrived
Red block (`#8B0000`), padding `18 16 22`, gap 14: 40px translucent circle (`rgba(247,243,236,.16)`) with the badge (serif 18px) · eyebrow `#E8C9C9` "YOU'VE ARRIVED" · serif 19px "You've arrived at Stop 2". Full-width CTA 56px, Paper bg, red 17px/700 "▶ Play audio (7 min)", radius 14, pressed `#EDE7DC`. A 2px ring `rgba(247,243,236,.7)` pulses around the CTA (`phtPulse`: scale 1→1.14, opacity .85→0, 1.6s ease-out infinite). Tapping Play opens the **expanded player**.

### Phase C — Expanded player (full-screen overlay, z above map)
Bg `#1C1714`, text Paper. Vertical flex:
- Top bar (padding `8 8 4`): 44px chevron-down (11px, 2px stroke) · centred grab handle 36×4 `rgba(247,243,236,.35)` + eyebrow 11px `#C9B8A6` "NOW PLAYING · STOP 2 · THE FALL OF PARIS" · 44px spacer. Tap anywhere on the bar, or **drag down > 70px**, collapses to the mini player.
- **Photo well**: `flex 0 0 44%` of the height, margin `6 16 0`, radius 14, bg `#2A2320`, `object-fit: cover`. Photo changes at its cue; new photo fades in (`phtFade`: opacity 0→1, scale 1.03→1, .7s ease-out). No photo → diagonal stripes `repeating-linear-gradient(135deg,#2A2320 0 10px,#302925 10px 20px)`, 48px red badge circle + serif 15px `#C9B8A6` "No photo for this passage — look around you." / FR "Pas de photo pour ce passage — regardez autour de vous."
- **Caption**: 12px italic `#C9B8A6`, centred, padding `8 20 0`, min-height 34 (reserve space even when empty).
- **Subtitle**: flex 1, centred both axes, padding `6 22`; serif 21/18/16px per length rule above; `text-wrap: pretty`. Shows the sentence whose `t ≤ elapsed`; swap instantly (no animation).
- **Controls block** (padding `0 16 22`, gap 8):
  - Seek: 24px tall hit area, 4px track `rgba(247,243,236,.22)`, fill Paper, 14px Paper thumb; time labels 11px `#C9B8A6` tabular, elapsed left / total right. Tap/drag seeks.
  - Transport row: **CSS grid `48 48 64 48 48`, gap 14, centred** — ⏮ prev · −15 · ▶/❚❚ · +15 · ⏭ next. Side buttons 48px, transparent, 1px border `rgba(247,243,236,.3)`, pressed `rgba(247,243,236,.12)`; ±15 labels 12px/700. Play button 64px Paper circle (pressed `#E4DCD0`), red glyph: play triangle 24px path `M7 4 L21 12 L7 20`, pause = two 6×22 bars gap 5. **Play must sit dead-centre of the screen width** (that is why it is a symmetric grid, not a flex row).
  - Footer line 12px `#C9B8A6`, ellipsis: "3:42 left · Next: Interstop — Théâtre de l'Odéon".

### Phase C' — Mini player (collapsed, above the map)
White bar, top hairline, padding `14 16 18`, gap 10:
- Header row (tap → expand): 44px rounded-8 thumbnail of current photo (omitted when none) · eyebrow red 11px/600 "NOW PLAYING · STOP 2 · THE FALL OF PARIS" + serif 18px/700 stop name · chevron-up 9px `#6B5A4E`.
- Seek: same geometry, track `#E4DCD0`, fill + thumb `#8B0000` (thumb has 2px white border, shadow `0 1px 3px rgba(0,0,0,.3)`).
- Transport row: same 5-column grid; side buttons Paper bg + hairline border, ink glyphs; play button 64px red (`#8B0000`, pressed `#6E0000`, shadow) with Paper glyph.
- Footer line 12px `#6B5A4E`.

### Phase D — Tour complete (bottom sheet over scrim)
Scrim `rgba(28,23,20,.45)`. Sheet Paper, radius `24 24 0 0`, padding `26 22 28`, gap 18: monogram + red eyebrow "TOUR COMPLETE" · serif 28px "Merci — and well walked." · 14px muted body · 3-cell stat strip (hairline grid, white cells, serif 20px value + 10px uppercase label: Duration 1 h 34 / Walked 2.1 km / Stops 9 / 9 — compute the real values) · primary CTA 54px red "Leave a Google review" → `https://maps.app.goo.gl/AGYuzh8jHA9KXv9h8` · secondary 54px outlined 1.5px ink "Discover my in-person tours" → `https://www.parishistorytours.com/` · underlined 13px "Restart tour".

### Menu (bottom sheet over scrim, z above everything)
Paper sheet radius 24 top, padding `14 20 28`; grab handle 40×4 `#C9B8A6`. Rows 15px ink separated by hairlines, ≥ 44px tall:
- Language — EN | FR segmented (1px ink border, radius 8, 52×36 cells; selected: ink bg / Paper text)
- Download PDF map ↓ (link to hosted PDF)
- Contact Clément — WhatsApp ↗ → `https://wa.me/33620622480`
- Location — On/Off pill (toggles GPS; if permission denied, deep-link to settings)
- Restart tour (red text)
- Footer 11px muted "Paris History Tours · parishistorytours.com" (+ OSM/map attribution)

---

## Interactions & behaviour
- **Phase machine**: `walking → arrived → playing → walking(idx+1) … → complete`. `completed = max(completed, idx)` drives progress bar and visited pins.
- **Arrival**: geofence ~25 m around the stop (prototype: "I'm here" button). Tapping any pin forces `arrived` on that stop (this is the fallback when GPS is denied).
- **Play**: starts audio for the stop, opens expanded player. Audio keeps playing when collapsed, when the screen locks, and with the app backgrounded (Media Session API: title = stop name, artist = "WWII Left Bank · Paris History Tours", artwork = current photo).
- **Ticker**: subtitle = last `subs` entry with `t ≤ currentTime`; photo = last `media` entry with `t ≤ currentTime`. Drive from the audio element's `timeupdate`, not a setInterval.
- **Transport**: ⏮ = restart track, or previous stop if within first 5 s; ±15 s; ⏭ = finish current stop (advance to walking for next). End of audio → auto `finish()`.
- **Seek** by tap or drag on either seek bar.
- **Collapse/expand**: chevron/tap header, or swipe down > 70 px on the expanded player; mini header tap re-expands. Prefer a 250–300 ms ease-out slide for the sheet.
- **Bearing arrow** rotates smoothly (`transform .4s ease`) from device heading & stop bearing; hide arrow (show ring) when heading/GPS unavailable.
- **Language** switch is instant and persists; changes UI copy only until FR audio/subtitles exist.
- Pressed states: as listed per button (`style-active` in the prototype). No hover states (touch app).
- Empty/edge states: no photo for a section (stripes placeholder); GPS denied (banner + hollow ring + "Tap a pin to start" eyebrow + "—" distance); last stop ⏭ → complete sheet.

## Copy (EN / FR)
All UI strings live in the `T` object in `AudioGuide.dc.html` — port verbatim. Narration sentences: `tour-content.js`. Captions: `tour-content.js` (`cap`).

## Assets
- `photos/*.png` — extracted from the PDF (historical photos, public-domain/archival; verify rights before publishing). Mapping photo → sentence is in `tour-content.js`.
- Monogram "P" is typed (Georgia), no logo file. Icons are CSS/inline SVG shapes (chevrons, bars, play triangle, crosshair) — recreate with the platform's icon set at the same sizes.
- Map tiles: OSM France in the prototype; production key/SDK to be chosen.
- Audio: **not yet produced**. Generate EN (and later FR) narration from `tour-text.txt` / `tour-content.js` with a TTS provider that returns word timestamps; store per-sentence `t`.

## Open items for the developer
1. Real TTS audio + timestamps (replaces `timeline()` heuristic).
2. Verify stop coordinates and route on site; consider a routed footpath polyline.
3. Geofence radius & GPS-denied UX tuning after a field test.
4. FR narration/subtitles.
5. Hosted PDF for the "Download PDF map" link; analytics (stop reached, audio completed, review CTA tapped).
