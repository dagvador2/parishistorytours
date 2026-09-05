/**
 * Raw PCM helpers. Fish Audio's `format: "pcm"` returns signed 16-bit
 * little-endian mono samples at 44.1 kHz, with no container. Its `wav` output
 * carries bogus RIFF sizes (streaming header), so we wrap PCM ourselves.
 */
export const PCM_SAMPLE_RATE = 44100;
export const PCM_CHANNELS = 1;
export const PCM_BITS = 16;
const BYTES_PER_SEC = (PCM_SAMPLE_RATE * PCM_CHANNELS * PCM_BITS) / 8;

export function pcmDurationSec(pcm: Buffer): number {
  return pcm.length / BYTES_PER_SEC;
}

export function pcmSilence(seconds: number): Buffer {
  const bytes = Math.round(seconds * BYTES_PER_SEC) & ~1; // keep whole samples
  return Buffer.alloc(bytes);
}

export function pcmToWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // audio format = PCM
  header.writeUInt16LE(PCM_CHANNELS, 22);
  header.writeUInt32LE(PCM_SAMPLE_RATE, 24);
  header.writeUInt32LE(BYTES_PER_SEC, 28);
  header.writeUInt16LE((PCM_CHANNELS * PCM_BITS) / 8, 32);
  header.writeUInt16LE(PCM_BITS, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Strip a 44-byte canonical WAV header written by pcmToWav. */
export function wavToPcm(wav: Buffer): Buffer {
  if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 36, 40) !== "data") {
    throw new Error("Not a canonical 44-byte-header WAV file");
  }
  return wav.subarray(44);
}
