/** Verbose, prefixed progress logging shared by every pipeline script. */

const start = Date.now();

function stamp(): string {
  const s = (Date.now() - start) / 1000;
  return `[${s.toFixed(1).padStart(6)}s]`;
}

export const log = {
  info(scope: string, msg: string): void {
    console.log(`${stamp()} ${scope.padEnd(14)} ${msg}`);
  },
  warn(scope: string, msg: string): void {
    console.warn(`${stamp()} ${scope.padEnd(14)} WARN ${msg}`);
  },
  error(scope: string, msg: string): void {
    console.error(`${stamp()} ${scope.padEnd(14)} ERROR ${msg}`);
  },
  step(title: string): void {
    const rule = "-".repeat(72);
    console.log(`\n${rule}\n${title}\n${rule}`);
  },
};

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** Fish Audio list price for paid models (USD per million UTF-8 bytes). */
export const FISH_USD_PER_MB = 15;

export function fmtCost(utf8Bytes: number, model: string): string {
  if (model.endsWith("-free")) return "$0.00 (free model)";
  return `$${((utf8Bytes / 1_000_000) * FISH_USD_PER_MB).toFixed(4)}`;
}
