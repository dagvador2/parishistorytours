/**
 * What each tour actually is, in the words an email needs.
 *
 * The site's i18n files hold UI copy; these are the operational facts — how
 * long the walk runs, where it ends, and where the group forms up. They live
 * here because four different emails quote them and they must never drift
 * apart between a confirmation and the reminder that follows it.
 *
 * Distances and end points come from the FAQ answers in src/i18n/translations.
 */
import type { Lang } from './format';

export interface MeetingPoint {
  /** Street address, as a visitor would type it into Maps. */
  address: string;
  /** The sentence that removes the last doubt: which side, which doorway. */
  detail: Record<Lang, string>;
  /** Nearest métro, and which exit to take. */
  transit: Record<Lang, string>;
  mapUrl: string;
  /** Absolute URL of a photo of the spot, or null to send the email without one. */
  photo: string | null;
  photoAlt: Record<Lang, string>;
}

export interface TourFacts {
  name: Record<Lang, string>;
  /** Minutes on foot — also drives the .ics end time. */
  durationMinutes: number;
  onFoot: Record<Lang, string>;
  /** Where the walk ends, preposition included: "on the parvis…", "au jardin…". */
  endsAt: Record<Lang, string>;
  /**
   * Null until the exact spot is confirmed. The day-before reminder skips any
   * tour without one rather than send a customer to a vague street corner.
   */
  meetingPoint: MeetingPoint | null;
}

const SITE = 'https://www.parishistorytours.com';

export const TOURS: Record<string, TourFacts> = {
  'left-bank': {
    name: { en: 'WW2 Left Bank', fr: 'WW2 Rive Gauche' },
    durationMinutes: 120,
    onFoot: { en: '2 hours · 2.5 km', fr: '2 heures · 2,5 km' },
    endsAt: { en: 'on the parvis of Notre-Dame', fr: 'sur le parvis de Notre-Dame' },
    meetingPoint: {
      address: '60 boulevard Saint-Michel, 75006 Paris',
      // TODO(clément) : confirmer ces deux phrases, ce sont les seules du mail
      // que je n'ai pas pu tirer du code — elles décrivent le trottoir exact.
      detail: {
        en: 'On the pavement in front of number 60, by the entrance.',
        fr: 'Sur le trottoir devant le 60, à hauteur de l’entrée.',
      },
      transit: {
        en: 'Métro Cluny–La Sorbonne (line 10), boulevard Saint-Michel exit, then 80 m south.',
        fr: 'Métro Cluny–La Sorbonne (ligne 10), sortie boulevard Saint-Michel, puis 80 m vers le sud.',
      },
      mapUrl: 'https://maps.google.com/?q=60+Boulevard+Saint-Michel,+75006+Paris',
      photo: `${SITE}/photos/email/meeting-left-bank.jpg`,
      photoAlt: {
        en: 'The meeting point on boulevard Saint-Michel',
        fr: 'Le point de rendez-vous boulevard Saint-Michel',
      },
    },
  },
  'right-bank': {
    name: { en: 'WW2 Right Bank', fr: 'WW2 Rive Droite' },
    durationMinutes: 120,
    onFoot: { en: '2 hours on foot', fr: '2 heures à pied' },
    endsAt: { en: 'on Place Vendôme', fr: 'place Vendôme' },
    meetingPoint: null,
  },
  'general-history': {
    name: { en: 'General History of Paris', fr: 'Histoire générale de Paris' },
    durationMinutes: 120,
    onFoot: { en: '2 hours on foot', fr: '2 heures à pied' },
    endsAt: { en: 'in the Tuileries Garden', fr: 'au jardin des Tuileries' },
    meetingPoint: null,
  },
  'food-wine': {
    name: { en: 'Nourritour · Food & Wine', fr: 'Nourritour · Food & Wine' },
    durationMinutes: 150,
    onFoot: { en: 'about 2.5 hours', fr: 'environ 2 h 30' },
    endsAt: { en: 'in the 9th arrondissement', fr: 'dans le 9e arrondissement' },
    meetingPoint: null,
  },
};

/** Falls back to the raw slug so an unknown tour degrades to something legible. */
export function tourFacts(slug: string): TourFacts {
  return (
    TOURS[slug] ?? {
      name: { en: slug, fr: slug },
      durationMinutes: 120,
      onFoot: { en: '2 hours on foot', fr: '2 heures à pied' },
      endsAt: { en: 'in central Paris', fr: 'dans le centre de Paris' },
      meetingPoint: null,
    }
  );
}

export function tourName(slug: string, lang: Lang): string {
  return tourFacts(slug).name[lang];
}
