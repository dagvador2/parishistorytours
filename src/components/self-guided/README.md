# Self-guided audioguide — webapp (chantier B)

Mobile web app of the digital product **WWII Left Bank self-guided tour**.
Route `/self-guided-tour/access` (EN) and `/fr/self-guided-tour/access` (FR),
one React island (`App.tsx`) in a dedicated layout, no site chrome, system
fonts. Design source of truth: `design/audioguide-handoff/README.md`.

```
src/data/self-guided/left-bank-ww2.ts   STOPS (GPS, kinds, names), ROUTE polyline, geofence radius  ← edit after the field test
src/lib/self-guided/                    types, R2 client for Astro, assets builder, purchase/pdf/email/fulfil (commerce)
src/pages/api/self-guided/access.ts     GET ?token= → purchase + manifest with presigned URLs (2 h); assets.ts = same without the purchase
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
| `SELF_GUIDED_DEV_TOKEN` | `.env`, Vercel **Preview only** | optional: this exact `?token=` opens the app without a purchase (field tests). Unset in production |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | already set | checkout + webhook (test keys locally, live on Vercel) |
| `STRIPE_PRICE_ID_SELF_GUIDED_{EN,FR}_{EARLYBIRD,NORMAL}` | Vercel + `.env` | four ids from `scripts/self-guided/tools/create-stripe-product.ts` (one product per language, 900 / 1400 cents) |
| `SELF_GUIDED_LAUNCH_DATE` | Vercel + `.env` | ISO date; early-bird price for 30 days from there |
| `SELF_GUIDED_ACCESS_DAYS` | Vercel + `.env` | how long the purchase link opens the app (default 7) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + `.env` | digital_purchases is only reachable with the service role |
| `PUBLIC_SITE_URL` | Vercel | origin of the links in the purchase email |
| `PUBLIC_MAPBOX_TOKEN` | already set | not used by the audioguide (MapLibre + self-hosted tiles) |

## Access (chantier C)

A purchase creates a row in `digital_purchases` (migration in
`supabase/migrations/`) with a random `access_token`. The email links to
`/self-guided-tour/access?token=…`; the page validates the token server-side
(clear 401 page otherwise), the client stores it in localStorage so the
installed PWA works without the query string, and every API call carries it.
Access is time-limited: the link opens the app for `SELF_GUIDED_ACCESS_DAYS`
days (7 by default), the time to walk the tour during a stay. Past that the
page and the API answer 410 with a clear screen. There is no download
package and the 38-page printed guide is never served: it is the content the
app exists to protect, so the purchase email carries no attachment. If a
short welcome sheet is uploaded to `pdf/<product>/<lang>/welcome.pdf` it is
attached to the email and offered in the menu, watermarked with the buyer's
email; while none exists, the menu entry simply does not appear.

Flow: product page `/self-guided-tour` → `POST /api/create-checkout-self-guided`
→ Stripe Checkout → `/self-guided-tour/success` polls
`/api/self-guided/check-purchase` → webhook `checkout.session.completed`
with `metadata.product_slug` → insert + watermarked PDF + Resend email.
The webhook branch is additive: sessions without `product_slug` follow the
tour-booking path unchanged.

Local end-to-end test: `stripe login`, `stripe listen --forward-to
localhost:4321/api/stripe-webhook` (put the printed `whsec_` in `.env.local`
with `sk_test_` keys), create the product with `create-stripe-product.ts`,
apply the migration, then buy with card 4242 4242 4242 4242.

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
