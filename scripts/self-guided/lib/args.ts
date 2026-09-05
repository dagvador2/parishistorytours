/** Tiny argv parser: `--flag`, `--key value`, `--key=value`. */
export interface Args {
  flags: Set<string>;
  values: Map<string, string>;
  get(key: string): string | undefined;
  has(key: string): boolean;
}

export function parseArgs(argv: string[] = process.argv.slice(2)): Args {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq !== -1) {
      values.set(a.slice(2, eq), a.slice(eq + 1));
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      values.set(key, next);
      i++;
    } else {
      flags.add(key);
    }
  }
  return {
    flags,
    values,
    get: (k) => values.get(k),
    has: (k) => flags.has(k) || values.has(k),
  };
}
