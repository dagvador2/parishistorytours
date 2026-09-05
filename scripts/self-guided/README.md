# Self-guided tour — audio pipeline

Produces the assets of the digital product **WWII Left Bank self-guided tour**
(`left-bank-ww2`): 9 narrated sections per language with Clément's cloned voice,
a manifest with sentence timestamps for synchronised subtitles and photos, the
PDF masters, the 33 archive photos and the marketing previews, all stored on a
private Cloudflare R2 bucket. The webapp (chantier B) and the commerce
integration (chantier C) consume the bucket; nothing here touches the website.

```
scripts/audio-source/left-bank-ww2/      narration scripts (en/, fr/) + pdf/<lang>/master.pdf
design/audioguide-handoff/               Claude Design handoff (tour-content.js, photos/*.png)
scripts/self-guided/
  generate-audio.ts   TTS + timestamps + MP3 + manifest          pnpm self-guided:generate
  build-photos.ts     PNG -> WebP (max 1200 px, q82)             pnpm self-guided:photos
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

## Everyday commands

```bash
pnpm self-guided:generate --lang both                 # all 18 sections (cache makes re-runs free)
pnpm self-guided:generate --lang en --section 04-odeon   # one section after a script fix
pnpm self-guided:generate --lang fr --dry-run         # plan: chunks, cache hits, cost, no API call
pnpm self-guided:generate --lang fr --section 09-liberation --force   # ignore the cache
pnpm self-guided:photos                               # WebP conversion (skips up-to-date files)
pnpm self-guided:previews --lang both                 # needs 01-intro.mp3
pnpm self-guided:upload --dry-run                     # what would be pushed
pnpm self-guided:upload                               # push; unchanged objects are skipped
```

### Fixing a sentence

1. Edit the `.txt` under `scripts/audio-source/left-bank-ww2/<lang>/`.
2. `pnpm self-guided:generate --lang <lang> --section <id>` — only the paragraph
   group containing the change is re-synthesised (cache is keyed by text + voice
   + model), the MP3 and the manifest entry are rebuilt.
3. `pnpm self-guided:upload` — only the changed MP3 and the manifest go up.

### Moving a photo cue or changing a caption

Edit `config/media-cues.<lang>.json` (`cap`, or `anchor.paragraph` +
`anchor.startsWith`, the first words of the target sentence). For a durable
placement that survives `tools/build-media-cues.ts`, add it to
`config/media-cues.overrides.json` instead. Then run the generator for that
section: the audio is cached, only the manifest changes.

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
      "media": [{ "t": 61.2, "img": "photos/left-bank-ww2/p05_0.webp", "cap": "…", "w": 1200, "h": 675 }]
    }
  ]
}
```

- `sections[].id` and the bucket layout are stable identifiers: never rename.
- `subs[].text` is what to display; `t` in seconds from the start of the MP3.
  Show the last entry with `t ≤ currentTime`; same rule for `media`.
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
