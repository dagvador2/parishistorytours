# Self-guided audioguide — webapp (chantier B)

Mobile web app of the digital product **WWII Left Bank self-guided tour**.
Route `/self-guided-tour/access` (EN) and `/fr/self-guided-tour/access` (FR),
one React island (`App.tsx`) in a dedicated layout, no site chrome, system
fonts. Design source of truth: `design/audioguide-handoff/README.md`.

```
src/data/self-guided/left-bank-ww2.ts   STOPS (GPS, kinds, names), ROUTE polyline, geofence radius  ← edit after the field test
src/lib/self-guided/                    types (manifest contract), R2 client for Astro, dev-mode guard
src/pages/api/self-guided/assets.ts     GET manifest with presigned URLs (2 h), languages available on the bucket
src/pages/self-guided-tour/access.astro EN page (SSR); src/pages/fr/self-guided-tour/access.astro rewrites to it
src/layouts/SelfGuidedLayout.astro      app-like layout, PWA meta, GA4 bootstrap
src/styles/self-guided.css              design tokens + component classes (Tailwind is not loaded here)
src/components/self-guided/
  App.tsx            root: state machine wiring, geofence, audio, media session, offline, analytics
  state.ts           reducer (walking → arrived → playing → … → complete) + localStorage persistence
  i18n.ts            T object of the prototype (verbatim) + extra strings
  MapView.tsx        MapLibre map, pins, route, user dot, fit; mapStyle.ts = sepia Protomaps flavor
  NextStopCard / PlayerWalking / PlayerArrived / PlayerMini / PlayerExpanded / CompleteSheet / Menu
  SeekBar / Transport / Header / Progress
  useAudioEngine.ts  single <audio>, timeupdate → sync, ended → next stop
  sync.ts            subtitle/photo = last entry with t ≤ currentTime
  useGeolocation.ts  watchPosition + compass, ?sim=… dev aids
  useMediaSession.ts lock-screen controls
  useOffline.ts      registers the service worker, asks it to precache the tour
public/self-guided-tour/sw.js           service worker (scope /self-guided-tour/ and /fr/self-guided-tour/)
public/self-guided-tour/manifest*.webmanifest + icon-*.png
public/self-guided/map/                 PMTiles extract of the Latin Quarter + Noto glyphs (tools/extract-map.sh)
scripts/self-guided/tools/set-r2-cors.ts  CORS policy of the bucket (needed by the precache)
```

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Vercel + `.env` | private bucket (same values as the pipeline) |
| `R2_JURISDICTION=eu` | Vercel + `.env` | EU bucket endpoint `<account>.eu.r2.cloudflarestorage.com` |
| `SELF_GUIDED_DEV_MODE=true` | Vercel **Preview only** + `.env` | temporary guard; the page and the API answer 404 without it. Removed by chantier C |
| `PUBLIC_MAPBOX_TOKEN` | already set | not used by the audioguide (MapLibre + self-hosted tiles) |

## Languages

The UI language (`lang`, from the URL prefix, switchable in the menu, kept
in sync with the URL) and the narration language are separate. The API
serves the requested language when its manifest exists on the bucket,
otherwise the first available one, and reports `available`. Until the EN
narration is uploaded, EN visitors get the EN interface with the FR audio,
subtitles and captions, plus a discreet note; the menu shows a "Narration
EN | FR" selector only when both manifests exist. Nothing to deploy when
`manifest/left-bank-ww2/en.json` lands.

## Offline

On first load the service worker precaches the 9 MP3, the photos, the PDF,
the basemap and the glyphs (~40 MB) and reports progress in the menu.
Signed URLs change at every API call, so R2 objects are cached by path and
served with synthesised `206` answers to Range requests (Safari needs
that). The API answer is cached network-first so the app starts offline.
Safari evicts the caches after 7 days without a visit unless the app is
added to the home screen. The bucket needs the CORS policy applied by
`tools/set-r2-cors.ts` (add an `--origin` for a new test domain).

## Testing on a phone

Geolocation, the service worker and the Media Session need HTTPS:

```bash
pnpm dev                                          # port 4321
cloudflared tunnel --url http://localhost:4321     # brew install cloudflared; prints an https://….trycloudflare.com URL
```

`astro.config.mjs` already allows `*.trycloudflare.com` and ngrok hosts.
For the real offline test (airplane mode) use a Vercel preview deployment
of the branch with `SELF_GUIDED_DEV_MODE=true`.

Dev aids: `?sim=1` places the visitor at the prototype's test position,
`?sim=48.8489,2.3373` anywhere, `?sim=walk` walks the route at 1.3 m/s.

## Field test checklist

- coordinates in `left-bank-ww2.ts` (`pos`), then `GEOFENCE_RADIUS_M`
- `ROUTE` polyline (or replace it with a routed footpath)
- compass arrow on iOS (permission prompt at the first tap)
- audio continues with the screen locked, lock-screen artwork updates
- offline: airplane mode after "Ready for offline use ✓"
