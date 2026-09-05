import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkAlignment, letterStream, parseTimestampSse, synthesizeWithTimestamps } from "./fish.ts";
import { pcmDurationSec, pcmSilence, pcmToWav, wavToPcm } from "./wav.ts";

const here = import.meta.dirname;
const sse = readFileSync(resolve(here, "__fixtures__/fish-sse-sample.txt"), "utf8");
const text = readFileSync(resolve(here, "__fixtures__/fish-sse-sample.text.txt"), "utf8");

test("parseTimestampSse: concatenates audio, keeps latest snapshot per chunk, offsets to global time", () => {
  const p = parseTimestampSse(sse);
  assert.equal(p.audio.length, 53 * 4); // one 4-byte chunk per event in the fixture
  assert.equal(p.chunkCount, 6);
  assert.equal(p.words.length, 257);
  assert.equal(p.words[0]!.text, "You");
  assert.equal(p.words[0]!.start, 0);
  assert.equal(p.words.at(-1)!.text, "later");
  assert.ok(p.words.at(-1)!.end > 92 && p.words.at(-1)!.end < 93.5);
  // monotonic
  for (let i = 1; i < p.words.length; i++) assert.ok(p.words[i]!.start >= p.words[i - 1]!.start - 1e-9, `word ${i} not monotonic`);
  assert.ok(Math.abs(p.alignedDurationSec - 92.9) < 0.5);
});

test("checkAlignment accepts the real take and rejects drift", () => {
  const p = parseTimestampSse(sse);
  const ok = checkAlignment(text, p.words);
  assert.ok(ok.ok, ok.reason);
  assert.equal(ok.textWords, 255); // 257 tokens minus two standalone em dashes
  const truncated = checkAlignment(text, p.words.slice(0, 200));
  assert.equal(truncated.ok, false);
  assert.match(truncated.reason!, /word count drift/);
  assert.equal(checkAlignment(text, []).ok, false);
});

test("countWords ignores standalone punctuation tokens", async () => {
  const { countWords } = await import("./fish.ts");
  assert.equal(countWords("Reynaud — c'est vrai : « Tout est perdu. » Deux ? Trois."), 8);
});

test("letterStream is tolerant to tokenisation differences", () => {
  assert.equal(letterStream("left-hand l'Odéon, look!"), letterStream("left hand l'Odéon look"));
  assert.equal(letterStream("Théâtre"), "théâtre");
});

test("wav helpers", () => {
  const pcm = pcmSilence(0.5);
  assert.equal(pcm.length, 44100); // 0.5 s * 44100 * 2 bytes
  assert.equal(pcmDurationSec(pcm), 0.5);
  const wav = pcmToWav(pcm);
  assert.equal(wav.length, 44 + pcm.length);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(24), 44100);
  assert.equal(wavToPcm(wav).length, pcm.length);
});

test("synthesizeWithTimestamps: retries on 503 then succeeds, fatal on 401", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls++;
    if (calls === 1) return new Response("overloaded", { status: 503 });
    return new Response(sse, { status: 200, headers: { "ratelimit-limit-concurrency": "5", "ratelimit-current-concurrency": "1" } });
  };
  const cfg = { apiKey: "k", voiceId: "v", model: "s2.1-pro-free", temperature: 0.3, topP: 0.7 };
  // shrink the backoff for the test by monkey-patching setTimeout
  const realSetTimeout = globalThis.setTimeout;
  (globalThis as any).setTimeout = (fn: () => void) => realSetTimeout(fn, 1);
  try {
    const r = await synthesizeWithTimestamps(text, cfg, { fetchImpl, scope: "test" });
    assert.equal(calls, 2);
    assert.equal(r.words.length, 257);
    assert.equal(r.pcm.length, 212);
    await assert.rejects(
      synthesizeWithTimestamps("x", cfg, { fetchImpl: async () => new Response("nope", { status: 401 }) }),
      /HTTP 401/,
    );
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
});
