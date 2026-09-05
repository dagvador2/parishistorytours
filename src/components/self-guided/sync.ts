/**
 * Subtitle / photo synchronisation: show the last entry whose `t` is
 * ≤ currentTime (scripts/self-guided/README.md, "Manifest contract").
 */
import type { ManifestMedia, ManifestSub } from "../../lib/self-guided/types";

function lastAtOrBefore<T extends { t: number }>(items: T[], time: number): T | null {
  // Binary search on t (arrays are sorted by construction).
  let lo = 0;
  let hi = items.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].t <= time) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found >= 0 ? items[found] : null;
}

export function currentSub(subs: ManifestSub[], time: number): ManifestSub | null {
  return lastAtOrBefore(subs, time) ?? subs[0] ?? null;
}

export function currentMedia<M extends ManifestMedia>(media: M[], time: number): M | null {
  return lastAtOrBefore(media, time);
}

/** 21 / 18 / 16 px depending on the sentence length (design rule). */
export function subtitleSize(text: string): number {
  return text.length > 170 ? 16 : text.length > 110 ? 18 : 21;
}
