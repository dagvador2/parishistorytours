export interface TourInfo {
  slug: string;
  nameEN: string;
  nameFR: string;
  stopsEN: string;
  stopsFR: string;
  thumb: string;
}

export const tourInfo: Record<string, TourInfo> = {
  'left-bank': {
    slug: 'left-bank',
    nameEN: 'Left Bank WWII Tour',
    nameFR: 'Visite Rive Gauche',
    stopsEN: 'Panthéon · Sorbonne · Notre-Dame',
    stopsFR: 'Panthéon · Sorbonne · Notre-Dame',
    thumb: '/photos/thumbnails/pantheon_thumb.webp',
  },
  'right-bank': {
    slug: 'right-bank',
    nameEN: 'Right Bank WWII Tour',
    nameFR: 'Visite Rive Droite',
    stopsEN: 'Pont Alexandre III · Concorde · Vendôme',
    stopsFR: 'Pont Alexandre III · Concorde · Vendôme',
    thumb: '/photos/thumbnails/vendome_thumb.webp',
  },
  'general-history': {
    slug: 'general-history',
    nameEN: 'General History Tour',
    nameFR: 'Visite Histoire Générale',
    stopsEN: 'Cluny · Île de la Cité · Tuileries',
    stopsFR: 'Cluny · Île de la Cité · Tuileries',
    thumb: '/photos/general_history/stop2_ile_cite.webp',
  },
  'food-wine': {
    slug: 'food-wine',
    nameEN: 'Nourritour · Food & Wine',
    nameFR: 'Nourritour · Food & Wine',
    stopsEN: 'Madlen · Chataigner · Thielen · Flaconneurs',
    stopsFR: 'Madlen · Chataigner · Thielen · Flaconneurs',
    thumb: '/photos/food_and_wine/nourritour-fromages-tomme-chevre-fromagerie.webp',
  },
};

export const getTourName = (slug: string, lang: string): string => {
  const info = tourInfo[slug];
  if (!info) return slug;
  return lang === 'fr' ? info.nameFR : info.nameEN;
};

export const getTourStops = (slug: string, lang: string): string => {
  const info = tourInfo[slug];
  if (!info) return '';
  return lang === 'fr' ? info.stopsFR : info.stopsEN;
};
