/**
 * Manifest contract shared by the API route and the client.
 * Source of truth: scripts/self-guided/README.md ("Manifest contract").
 */
export interface ManifestSub {
  /** seconds from the start of the MP3 */
  t: number;
  text: string;
}

export interface ManifestMedia {
  t: number;
  /** bucket key on input, signed URL on output */
  img: string;
  cap: string;
  w: number;
  h: number;
}

export interface ManifestSection {
  id: string;
  index: number;
  audio: string;
  durationSec: number;
  sourceHash?: string;
  subs: ManifestSub[];
  media: ManifestMedia[];
}

export interface Manifest {
  schemaVersion: number;
  product: string;
  lang: "en" | "fr";
  generatedAt: string;
  voice?: { provider: string; voiceId: string; model?: string };
  totalDurationSec: number;
  sections: ManifestSection[];
}

/** What GET /api/self-guided/assets returns: the manifest with every asset resolved to a signed URL. */
export interface AssetsResponse {
  product: string;
  /** language actually served */
  lang: "en" | "fr";
  /** language the client asked for */
  requested: "en" | "fr";
  /** languages whose manifest exists on the bucket */
  available: Array<"en" | "fr">;
  generatedAt: string;
  totalDurationSec: number;
  /** ISO date after which the signed URLs stop working */
  expiresAt: string;
  /** signed URL of the short welcome sheet, null when none is published */
  pdf: string | null;
  sections: Array<
    Omit<ManifestSection, "audio" | "media"> & {
      audio: string;
      audioKey: string;
      media: Array<ManifestMedia & { key: string }>;
    }
  >;
}

/** What GET /api/self-guided/access returns. */
export interface AccessResponse {
  purchase: {
    email: string;
    language: "en" | "fr";
    purchasedAt: string;
    /** the link opens on this date (evening before the chosen walk) */
    accessStartsAt: string;
    /** the access link stops working after this date */
    accessExpiresAt: string;
    /** whole days left before that (0 on the last day) */
    daysLeft: number;
  };
  assets: AssetsResponse;
}
