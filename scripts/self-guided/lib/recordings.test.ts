import { strict as assert } from "node:assert";
import test from "node:test";
import { RECORDING_LEAD_SEC, speechOnsetSec, trimRecordingHead } from "./recordings.ts";
import { PCM_SAMPLE_RATE } from "./wav.ts";

const samples = (seconds: number) => Math.round(seconds * PCM_SAMPLE_RATE);
/** `seconds` of silent 16-bit mono PCM. */
const silence = (seconds: number) => Buffer.alloc(samples(seconds) * 2);
const word = (text: string, start: number, end: number) => ({ text, start, end });

/** Write a tone of `amplitude` (0…1) into `pcm`, from `from` s for `dur` s. */
function tone(pcm: Buffer, from: number, dur: number, amplitude: number): void {
  for (let i = samples(from); i < samples(from + dur); i++) {
    const v = Math.sin((i / PCM_SAMPLE_RATE) * 2 * Math.PI * 220) * amplitude * 32767;
    if (i * 2 + 1 < pcm.length) pcm.writeInt16LE(Math.round(v), i * 2);
  }
}

test("speechOnsetSec ignores a click and finds the sustained voice", () => {
  const pcm = silence(4);
  tone(pcm, 0.80, 0.02, 0.9); // a click: loud, but 20 ms long
  tone(pcm, 1.20, 2.0, 0.3);  // the voice
  const onset = speechOnsetSec(pcm, 2.2);
  assert.ok(onset !== undefined, "an onset should be found");
  assert.ok(Math.abs(onset! - 1.2) < 0.05, `onset ${onset} should be near 1.2 s, not the click at 0.8 s`);
});

test("trimRecordingHead cuts the click Whisper's timestamp would have kept", () => {
  const pcm = silence(4);
  tone(pcm, 0.80, 0.02, 0.9);
  tone(pcm, 1.20, 2.0, 0.3);
  // Whisper lands early, before the click — trimming to it would keep the click.
  const r = trimRecordingHead(pcm, [word("bienvenue", 1.0, 1.6)]);
  assert.ok(r.trimmedSec > 1.0, `should cut past the click, cut ${r.trimmedSec}`);
  assert.ok(Math.abs(r.trimmedSec - (1.2 - RECORDING_LEAD_SEC)) < 0.05);
  // the word timestamp can end up before the cut; the audio wins, so it clamps
  assert.ok(r.words[0]!.start >= 0);
});

test("trimRecordingHead falls back to the word timestamp when it hears nothing", () => {
  const r = trimRecordingHead(silence(10), [word("bienvenue", 2.44, 3.0), word("au", 3.0, 3.48)]);
  assert.equal(Number(r.trimmedSec.toFixed(2)), Number((2.44 - RECORDING_LEAD_SEC).toFixed(2)));
  assert.equal(Number(r.words[0]!.start.toFixed(2)), RECORDING_LEAD_SEC);
  // the audio lost exactly what the timestamps lost
  assert.equal(Number((10 - r.pcm.length / 2 / PCM_SAMPLE_RATE).toFixed(2)), Number(r.trimmedSec.toFixed(2)));
});

test("trimRecordingHead leaves a take that already starts on cue alone", () => {
  const pcm = silence(5);
  tone(pcm, 0.12, 2.0, 0.3);
  const r = trimRecordingHead(pcm, [word("bienvenue", 0.12, 0.9)]);
  assert.equal(r.trimmedSec, 0);
  assert.equal(r.pcm.length, silence(5).length);
  assert.equal(r.words[0]!.start, 0.12);
});
