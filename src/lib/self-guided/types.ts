/**
 * Manifest contract shared by the API route and the client.
 * Source of truth: scripts/self-guided/README.md ("Manifest contract").
 */
export interface ManifestSub {
  /** seconds from the start of the MP3 */
  t: number;
  text: string;
}

/**
 * The route map, which the player animates itself instead of showing a still:
 * `img` is the bare basemap, the walk is drawn over it from the app's own
 * ROUTE/STOPS projected with `proj`, and it advances on the audio clock — so it
 * pauses with the audio and follows a seek. A pre-rendered animation could do
 * none of that: it runs on its own clock.
 */
export interface ManifestRouteBeat {
  /** section id of the stop that lights up */
  stop: string;
  /** seconds from the start of the cue */
  at: number;
  /** medallion photo (signed URL); absent = the dot lights without one */
  img?: string;
  w?: number;
  h?: number;
}
export interface ManifestRoute {
  /** normalised Web Mercator bounds of the basemap image */
  proj: { x0: number; x1: number; y0: number; y1: number };
  credit: string;
  beats: ManifestRouteBeat[];
}

/**
 * A campaign map — the May 1940 offensive, the 1944 Allied advance — drawn the
 * same way as the route map: `img` is the bare basemap and each arrow of the
 * map's move table is drawn at the second it is spoken, on the audio clock.
 */
export interface ManifestCampaignBeat {
  /** move id in the map's own table (offensive-1940.ts, strategic-1944.ts) */
  move: string;
  /** seconds from the start of the cue */
  at: number;
  /** photo pinned into the frame by this move (signed URL) */
  img?: string;
  w?: number;
  h?: number;
}
export interface ManifestCampaign {
  /** normalised Web Mercator bounds of the basemap image */
  proj: { x0: number; x1: number; y0: number; y1: number };
  credit: string;
  beats: ManifestCampaignBeat[];
}

export interface ManifestMedia {
  t: number;
  /** bucket key on input, signed URL on output */
  img: string;
  cap: string;
  w: number;
  h: number;
  /**
   * Present when the cue is a clip: bucket key on input, signed URL on output,
   * of an MP4 to play in the well instead of the still — `img` is its poster.
   */
  video?: string;
  /** CSS `object-position` for the image well; absent means a centre crop */
  pos?: string;
  /** present on the route map: the player draws and animates it */
  route?: ManifestRoute;
  /** present on the May 1940 map: likewise, arrow by arrow */
  offensive?: ManifestCampaign;
  /** present on the 1944 map of the Allied advance: same drawing, other geography */
  strategic?: ManifestCampaign;
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
