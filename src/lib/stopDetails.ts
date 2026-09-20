import { tours } from '../data/tours';
import type { StopDetail } from '../components/TourMap';

/**
 * Ce qu'un repère de carte affiche pour un arrêt : la photo du lieu, son nom
 * court à côté du médaillon, et le détail dans la bulle.
 *
 * L'accueil et les pages de visite s'en servent toutes les deux, pour que la
 * même carte ne raconte pas deux choses différentes selon la page.
 */
export function buildStopDetails(
  slug: keyof typeof tours,
  stops: { title: string; blurb?: string; time?: string }[],
): StopDetail[] {
  const configured = tours[slug]?.stops ?? [];

  return stops.map((stop, i) => {
    const photo = configured[i]?.mapPhoto ?? configured[i]?.src;
    return {
      photo,
      title: stop.title,
      // Les titres sont de la forme « Lieu - Thème » : le médaillon ne porte
      // que le lieu, sinon l'étiquette déborde de la carte.
      label: splitPlace(stop.title),
      blurb: stop.blurb,
      time: stop.time,
    };
  });
}

/** « Palais du Luxembourg - La Chute » → « Palais du Luxembourg ». */
export function splitPlace(title: string): string {
  return title.split(/\s+[–—-]\s+/)[0].trim();
}
