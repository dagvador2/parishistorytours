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
  stops: { title: string; blurb?: string; time?: string; description?: string }[],
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
      // La fiche de survol tient deux phrases : au-delà, elle devient un mur
      // de texte posé sur la carte.
      description: stop.description ? firstSentences(stop.description, 2) : undefined,
    };
  });
}

/** « Palais du Luxembourg - La Chute » → « Palais du Luxembourg ». */
export function splitPlace(title: string): string {
  return title.split(/\s+[–—-]\s+/)[0].trim();
}

/**
 * Le début d'un paragraphe, coupé net à la fin d'une phrase : au plus `count`
 * phrases, et jamais plus de `maxLength` caractères — sauf si la première
 * phrase est déjà plus longue, auquel cas elle passe seule.
 *
 * Pas de points de suspension : une phrase entière se lit, une phrase coupée
 * se devine.
 */
export function firstSentences(text: string, count: number, maxLength = 250): string {
  const sentences = text
    .trim()
    .split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ«"'])/u)
    .filter(Boolean);

  let kept = sentences[0] ?? '';
  for (let i = 1; i < Math.min(count, sentences.length); i++) {
    const next = `${kept} ${sentences[i]}`;
    if (next.length > maxLength) break;
    kept = next;
  }
  return kept;
}
