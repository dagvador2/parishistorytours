# Self-guided tour — audio pipeline

Produces the assets of the digital product **WWII Left Bank self-guided tour**
(`left-bank-ww2`): 9 narrated sections per language with Clément's cloned voice,
a manifest with sentence timestamps for synchronised subtitles and photos, the
PDF masters, the 33 archive photos and the marketing previews, all stored on a
private Cloudflare R2 bucket. The webapp (chantier B) and the commerce
integration (chantier C) consume the bucket; nothing here touches the website.

```
scripts/audio-source/left-bank-ww2/      narration scripts (en/, fr/) + pdf/<lang>/master.pdf
design/audioguide-handoff/               photos/ (WebP sources), video/ + originals/ (masters)
scripts/self-guided/
  generate-audio.ts   TTS + timestamps + MP3 + manifest          pnpm self-guided:generate
  build-photos.ts     PNG/JPEG -> WebP (max 1200 px, q82)       pnpm self-guided:photos
  make-previews.ts    30 s intro excerpt + 3-page PDF preview    pnpm self-guided:previews
  upload-r2.ts        push everything to R2                      pnpm self-guided:upload
  config/             media-cues.<lang>.json (photo anchors), captions.pdf.json, overrides
  lib/                fish.ts, text.ts, numbers.ts, align.ts, manifest.ts, r2.ts, ffmpeg.ts…
  tools/              one-off helpers (voice cloning, bucket creation, cue building, reports)
  output/             generated files (gitignored except output/manifest/)
```

Tests: `pnpm self-guided:test` (node:test through tsx).

## Requirements

- Node ≥ 22, pnpm, `ffmpeg` + `ffprobe` on PATH (`brew install ffmpeg`)
- Python 3 + PyMuPDF only for `tools/extract-pdf-captions.py`
- `.env` (see `.env.example`):

| Variable | Purpose |
|---|---|
| `FISH_AUDIO_API_KEY` | Fish Audio API key |
| `FISH_AUDIO_VOICE_ID` | cloned voice `reference_id`, fallback for every language |
| `FISH_AUDIO_VOICE_ID_EN` / `_FR` | per-language clone (a FR-trained clone reads EN with a heavy accent) |
| `FISH_AUDIO_MODEL` | `s2.1-pro-free` (free, same model) or `s2.1-pro` ($15 / M UTF-8 bytes, ≈ $0.70 per language here) |
| `FISH_AUDIO_TEMPERATURE` / `FISH_AUDIO_TOP_P` | default 0.3 / 0.7, tighter than Fish's defaults to avoid hallucinated words |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | private bucket `parishistorytours-self-guided` |
| `R2_JURISDICTION` | `eu`: the bucket is jurisdiction-restricted, its S3 endpoint is `<account>.eu.r2.cloudflarestorage.com` |

## Everyday commands

```bash
pnpm self-guided:generate --lang both                 # all 18 sections (cache makes re-runs free)
pnpm self-guided:generate --lang en --section 04-odeon   # one section after a script fix
pnpm self-guided:generate --lang fr --dry-run         # plan: chunks, cache hits, cost, no API call
pnpm self-guided:generate --lang fr --section 09-liberation --force   # ignore the cache
pnpm self-guided:photos                               # WebP conversion (skips up-to-date files)
pnpm self-guided:previews --lang both                 # needs 01-intro.mp3
pnpm self-guided:review --lang fr                     # listen locally: audio + subtitles + photos, no upload
pnpm self-guided:upload --dry-run                     # what would be pushed
pnpm self-guided:upload --lang fr                     # push one language (+ photos); unchanged objects are skipped
pnpm tsx scripts/self-guided/tools/presign.ts manifest/left-bank-ww2/fr.json --check   # signed URL for a private object
```

## Recorded voice (Clément's own narration)

A section whose audio was recorded by hand overrides the TTS entirely. Drop the
take in `scripts/audio-source/left-bank-ww2/recordings/<lang>/<section-id>.m4a`
(`.wav`, `.mp3`, `.aiff` and `.flac` work too) and the generator picks it up on
its own — no flag, nothing else to change:

```bash
pnpm tsx scripts/self-guided/tools/transcribe-recording.ts --lang fr --section 01-intro
pnpm self-guided:generate --lang fr --section 01-intro
```

1. **Transcribe once.** The tool runs Whisper with word timestamps, writes them
   next to the take as `<section-id>.words.json`, then prints every place where
   the script and what was actually said differ (numbers are ignored: the
   script spells them out, Whisper writes digits).
2. **Edit the script to match the take.** The `.txt` is what the subtitles are
   built from and what the photo anchors point at, so it has to say what the
   voice says. The take is the source of truth, never the other way round.
3. **Generate.** The head of the take is trimmed. The cut point is read from
   the signal (`speechOnsetSec`), not from the transcript: Whisper's first word
   lands slightly early, and a take usually carries an isolated click — a mouth
   noise, the record button — in the half second before speech, which loudness
   normalisation then lifts to nearly the level of the voice. The onset is the
   first window loud enough *and held* for 160 ms, which a few-millisecond click
   cannot be. 0.1 s of lead is kept, faded in so the cut is inaudible, and the
   word timestamps move with the audio, so nothing downstream shifts relative to
   the voice. The recording is then treated as a single pre-synthesised chunk:
   sentence alignment, subtitles, photo cues and the manifest are the same code
   as the TTS path. The audio is loudness-normalised and encoded exactly like a
   TTS section, so recorded and synthesised sections sound consistent.

The words file is keyed to the take by its sha: re-record and the generator
stops with the transcribe command to run. Re-transcribing is only ever needed
after a **new take**, not after a script edit. A letter drift above 2 % between
script and take is reported as a warning — past that the subtitles slide.

### Fixing a sentence

1. Edit the `.txt` under `scripts/audio-source/left-bank-ww2/<lang>/`.
2. `pnpm self-guided:generate --lang <lang> --section <id>` — only the paragraph
   group containing the change is re-synthesised (cache is keyed by text + voice
   + model), the MP3 and the manifest entry are rebuilt.
3. `pnpm self-guided:upload` — only the changed MP3 and the manifest go up.

### Moving a photo cue or changing a caption

Edit the spec in `tools/rebuild-cues.ts` and re-run it, then run the generator
for that section: the audio is cached, only the manifest changes. A spec names
the section, the paragraph and a substring of the target sentence, and takes
two optional fields:

| Field | Effect |
|---|---|
| `off` | seconds added to the anchored sentence's own time. Sentences are the finest anchor the scripts offer, so a run of photos meant to change every few seconds inside one long sentence is placed with `+3`, `+6`… A negative value pulls a cue earlier — `off: -99` on a section's first cue means "from the first frame" — and the result is clamped to 0. |
| `pos` | CSS `object-position` for the player's image well. The well is ~1.3:1 with `object-fit: cover`, so a tall portrait loses its head and a newspaper loses its masthead; `pos: "50% 20%"` reveals more of the top. Prefer this to cropping the source: the archive file stays intact and the same photo can be framed differently in two cues. |

`pnpm tsx scripts/self-guided/tools/contact-sheet.ts --crop` renders every
handoff photo the way the well will crop it — the quickest way to see which
cues need a `pos`.

**Both `media-cues.<lang>.json` are hand-built and no longer derive from the
PDF.** They are written by `tools/rebuild-cues.ts` after the September 2026
narration rewrite: the scripts diverged from the printed guide, and half the
photos (`n01_…`–`n18_…`) never existed in it. Do not run
`tools/build-media-cues.ts` any more — it only knows the PDF photos (`pNN_I`)
and would drop the rest. Add or move a cue in `tools/rebuild-cues.ts` (each
spec names a paragraph plus a substring of the target sentence, per language,
and the tool fails loudly when one no longer resolves), then re-run it. FR and
EN scripts are kept paragraph-for-paragraph parallel so both spec lists point
at the same paragraph indexes.

## How it works

1. **Text.** A script is split into paragraphs (blank lines), grouped into TTS
   requests of ≤ 1 500 characters. Sentences are detected on terminal
   punctuation + quotes; sentences longer than 170 characters are split at an
   em dash, `;` or `:` for display.
2. **TTS with timestamps.** `POST https://api.fish.audio/v1/tts/stream/with-timestamp`
   returns an SSE stream of PCM chunks and cumulative word alignments
   (`lib/fish.ts`). Raw PCM is requested because Fish's WAV header carries bogus
   sizes. A guard rejects takes whose word count drifts > 5 % or letter count
   > 3 % from the text (hallucinated / dropped words) and retries.
3. **Cache.** `output/cache/<lang>/<section>/<hash>.{wav,json}` per request.
4. **Assembly.** Requests are joined with 400 ms of silence, normalised to
   −16 LUFS (two-pass linear loudnorm, no timing change) and encoded to MP3
   128 kbps mono 44.1 kHz.
5. **Subtitles.** Each sentence piece gets `t` = start of its first word, found
   through a letters-only stream so Fish's tokenisation ("left-hand" → 2 words)
   does not matter. The displayed text has numbers as digits
   (`lib/numbers.ts`: years, dates, clock times, percentages, cardinals ≥ 10,
   ordinals before Division/arrondissement/jour…); the spoken text is untouched.
6. **Photos.** `config/media-cues.<lang>.json` anchors each photo to a
   paragraph + sentence; `t` is that sentence's time. WebP dimensions are
   recorded so the webapp can reserve space.
7. **Manifest.** `output/manifest/<lang>.json` (committed) is merged per run, so a
   single-section run only replaces its entry. `<lang>.words.json` keeps every
   word timestamp for a future karaoke mode.

## Manifest contract (`manifest/left-bank-ww2/<lang>.json`)

```json
{
  "schemaVersion": 1,
  "product": "left-bank-ww2",
  "lang": "fr",
  "generatedAt": "2026-09-05T12:00:00.000Z",
  "voice": { "provider": "fish-audio", "voiceId": "c1daa68c…", "model": "s2.1-pro-free" },
  "totalDurationSec": 2402.3,
  "sections": [
    {
      "id": "04-odeon",
      "index": 3,
      "audio": "audio/left-bank-ww2/fr/04-odeon.mp3",
      "durationSec": 56.3,
      "sourceHash": "0dc3ca4a6665",
      "subs": [{ "t": 0, "text": "Vous êtes maintenant devant le Théâtre de l'Odéon." }],
      "media": [{ "t": 61.2, "img": "photos/left-bank-ww2/p05_0.webp", "cap": "…", "w": 1200, "h": 675, "pos": "50% 20%" }]
    }
  ]
}
```

- `sections[].id` and the bucket layout are stable identifiers: never rename.
- `subs[].text` is what to display; `t` in seconds from the start of the MP3.
  Show the last entry with `t ≤ currentTime`; same rule for `media`.
- `media[].pos` is optional: apply it as `object-position` on the image, and
  fall back to a centre crop when it is absent.
- `media[].video` is optional: the key of an MP4 (`tools/make-video-loop.ts`) to
  play in the well instead of the still, `img` being its poster — same box, same
  `pos`. It is muted, inline and looping, and it runs on the **audio clock**
  like the live maps below: it pauses with the narration and follows a seek
  (`ClipWell.tsx`). Sign it and precache it like any other object.
- `media[].route`, `media[].offensive` and `media[].strategic` turn a cue into a
  **live map**: `img` is a bare basemap and the drawing is done by the player, on
  the audio clock (see "Live maps" below). `proj` is the normalised Web Mercator
  window of that image, `credit` the attribution to show, and `beats[]` says what
  happens at which second of the cue. They carry photos of their own
  (`beats[].img`), which are separate bucket objects: sign them and precache them
  like any other.
- GPS coordinates and route metadata are **not** here (webapp config).
- Bucket keys: `audio/…`, `manifest/…`, `pdf/<product>/<lang>/master.pdf`,
  `photos/<product>/<name>.webp`, `preview/<product>/<lang>/intro-30s.mp3`,
  `preview/<product>/<lang>/pdf-preview.pdf`. Everything but `manifest/` is
  uploaded with `Cache-Control: immutable`.

## Voice cloning

One clone per language. Record 2–3 minutes in the target language (several
short takes, narration tone, quiet room, hand's width from the mic, half-second
pauses), drop the files in `scripts/audio-source/voice-samples/<lang>/`
(gitignored), then:

```bash
pnpm tsx scripts/self-guided/tools/create-voice.ts --dir scripts/audio-source/voice-samples/en --title "Voix de guide EN" --lang en
```

Set the printed id as `FISH_AUDIO_VOICE_ID_EN` and regenerate that language
(`--force` is not needed: the voice id is part of the cache key).

## R2

The bucket was created with `tools/create-r2-bucket.ts` (Cloudflare API token
with R2 write permission, passed in the environment). Uploads use a
bucket-scoped **R2 API token** (dashboard → R2 → Manage API tokens → Object Read
& Write). The bucket is private; the webapp signs URLs with `presignGet()` from
`lib/r2.ts` (2 h default).

## Reports (regenerate any time, gitignored)

- `pnpm tsx scripts/self-guided/tools/report-display-text.ts` → every spoken →
  displayed rewrite, per language
- `pnpm tsx scripts/self-guided/tools/build-media-cues.ts` → photo anchoring
  decisions with scores
- `pnpm self-guided:review --lang fr` → http://localhost:4500, the generated
  audio played against the manifest: subtitles and photos appear exactly where
  the webapp will show them, with every cue and subtitle listed with its
  timestamp and clickable to seek. Reads `output/` directly — nothing is
  uploaded, so it is the step to run before `self-guided:upload`.
- `pnpm tsx scripts/self-guided/tools/check-drift.ts --lang fr` → how far each
  subtitle sits from the word it should start on, read back from
  `output/manifest/<lang>.words.json`. Matching resumes from the previous match
  and ignores punctuation-only tokens, because a short subtitle ("Bien.") and a
  repeated phrase will both fool a naive search.
- `pnpm tsx scripts/self-guided/tools/contact-sheet.ts [--crop] [--filter n3]` →
  a single JPEG of every handoff photo, optionally cropped to the player's well.
### Live maps

Three cues are animated by the player rather than pre-rendered: the walk
(`RouteMap`), the May 1940 German offensive and the 1944 Allied advance (both
`CampaignMap`, one drawing over two sets of geography). The first two were baked
animations once and both failed the same way — an animated WebP runs on its
**own** clock, so it kept going through a pause, ignored a seek, and was
usually part-way through by the time it appeared (the player preloads photos,
and the browser shares one animation timeline between elements pointing at the
same file). A loop cannot stop either, so the offensive had to be four separate
files that each began again from an empty map. Drawn live they pause, seek,
replay from zero, run at sixty frames instead of ten, stay sharp at any size,
and cost 146 KB where the four clips cost 2.9 MB.

The pipeline only ships the basemap and the times:

- `pnpm tsx scripts/self-guided/tools/make-route-basemap.ts [--zoom 16] [--wash .92]`
  → `map_base` + `config/route-map.json` (the walk).
- `pnpm tsx scripts/self-guided/tools/make-offensive-basemap.ts [--wash .94]`
  → `map_1940` + `config/offensive-map.json` (May 1940). The geography — the
  arrows, the towns, the dated pills, the legend, the Gamelin portrait — lives
  in `src/data/self-guided/offensive-1940.ts`, shared by the tool, the player
  and the preview renderer so the three cannot drift.
- `pnpm tsx scripts/self-guided/tools/make-strategic-basemap.ts [--wash .94]`
  → `map_1944` + `config/strategic-map.json` (the last stop: Normandy, Paris,
  Berlin, then what a liberated capital costs and the road round it), geography
  in `src/data/self-guided/strategic-1944.ts`. Both maps are the same drawing
  over different data — the shapes are in `src/data/self-guided/campaign-map.ts`
  and `src/components/self-guided/campaignScene.ts` renders either, so a third
  map needs no new renderer. It replaces the still
  `tools/make-strategic-map.ts` drew, which could show the three cities but not
  the argument the narration makes over them; that tool is kept because the EN
  narration still uses the still.
- Times come from the narration, never from a fixed rhythm: each beat names a
  phrase and `generate-audio.ts` resolves it against
  `output/manifest/<lang>.words.json`. **A phrase must contain no number** —
  the transcript writes "13 mai" where the script says "treize mai" — and the
  cues themselves are edited in `tools/rebuild-cues.ts`, never in
  `tools/build-media-cues.ts`, which only knows the printed guide's photos.
- `pnpm tsx scripts/self-guided/tools/preview-route-map.ts [--section …] [--at …]`
  and `pnpm tsx scripts/self-guided/tools/preview-campaign-map.ts [--map
  offensive|strategic] [--at …] [--contact] [--well 390x371]` render frames to
  PNG. The campaign preview calls the very function the component calls, so the
  picture cannot flatter the page; `--well` crops the frame the way a handset
  does (`object-fit: cover`), which is how you check that no type has drifted
  into what gets cut — the well is about 0.95:1 on an iPhone 14 against the
  map's 1.3:1, so a seventh of the width goes on each side.

- `pnpm tsx scripts/self-guided/tools/make-strategic-map.ts` → the
  Normandy → Paris → Berlin still (`n48_carte_normandie_berlin`), still used by
  the EN narration at the last stop; FR now plays the live map above.
- `pnpm tsx scripts/self-guided/tools/make-generals-diptych.ts` → Eisenhower and
  Bradley side by side on paper (`n91_…`), from the two portraits in
  `design/audioguide-handoff/originals/`. The narration names the two men in one
  breath and the archive shot that stood there had three faces in it.
- `pnpm tsx scripts/self-guided/tools/make-route-anim.ts [--fps 24] [--width 1040]`
  → the route drawing itself with a medallion opening at each point, **timed on
  the narration**: the times come from `output/manifest/<lang>.words.json`, so a
  place lights up as it is named and re-recording a take moves the animation
  with the voice. Nothing is hand-timed — which is why there is one file per
  cue (`VARIANTS` at the top): the intro walks through the whole itinerary while
  stop 1 only lists the four main stops, on a different rhythm. Each file lasts
  exactly as long as its cue stays on screen, so it never restarts mid-sentence.
  A pale dotted ghost of the whole walk is there from the first frame, so the
  map already means something while the narration is still on generalities.
  Only one medallion is open at a time, and points named in one breath ("ensuite
  trois courts arrêts autour de la Sorbonne") light their dot without one.
  Same data and the same washed frame as the still below, so the two cannot
  drift apart (`lib/maptiles.ts` builds the frame for both). Change the photo of
  a point in the `MEDALLION` table.
- `pnpm tsx scripts/self-guided/tools/make-route-map.ts [--zoom 16] [--wash .92] [--style osm] [--name …]`
  → `n03_carte_tour`, drawn from `STOPS` / `ROUTE` in
  `src/data/self-guided/left-bank-ww2.ts`, so the printed map and the one the
  visitor navigates with cannot drift apart. The stock OSM style is very busy at
  street zoom, so the default is one zoom level out with the basemap washed
  towards paper — the route should be the only thing the eye lands on. A CARTO
  Positron key would look better still: `--style carto` / `carto-nolabels` is
  wired up and only needs the key (their tiles are watermarked without one).
- `pnpm tsx scripts/self-guided/tools/route-from-osrm.ts [--write]` → replaces
  that `ROUTE` with a line snapped to the real footpath network. Check the
  regenerated map afterwards: a router follows the network, not the narration
  (the Jardin du Luxembourg needs a `VIA` point, which is why the table exists).
- `pnpm tsx scripts/self-guided/tools/make-video-loop.ts --in <clip> --name <anim_…>`
  → a phone clip becomes a seamless loop for the photo well: centre-cropped to
  the well's ratio and played forward-then-backward so it never jumps. It writes
  `<name>.mp4` (H.264, 30 fps) **and** `<name>.webp`, the first frame, which is
  the poster and the still every other tool shows — so a clip needs no special
  case in the contact sheet, the well preview or the review DOCX. The manifest
  cue then carries `video` beside `img`. Until September 2026 this wrote an
  animated WebP instead: with no real motion compensation a moving shot costs
  the same per frame whatever the rate, so it had to run at 8 fps to stay under
  4 MB and the sweep stuttered — the same eleven seconds at 30 fps came to
  15 MB, against 3.4 MB as H.264.
- `pnpm tsx scripts/self-guided/tools/export-docx.ts --lang both` →
  `output/review/narration-<lang>.docx`: the spoken text verbatim with every
  photo placed where it appears, for review and hand editing. Paragraph
  splitting and anchor resolution reuse the generator's own helpers, so an
  anchor that would break is flagged in red in the document.
