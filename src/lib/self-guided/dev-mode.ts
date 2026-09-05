/**
 * Temporary guard for chantier B: the webapp and its API are only reachable
 * when SELF_GUIDED_DEV_MODE=true. Chantier C replaces this with the purchase
 * token check.
 */
export function selfGuidedDevMode(): boolean {
  const v = (import.meta.env as Record<string, string | undefined>).SELF_GUIDED_DEV_MODE ?? process.env.SELF_GUIDED_DEV_MODE;
  return v === "true" || v === "1";
}
