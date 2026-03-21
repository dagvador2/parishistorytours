export interface TourInfo {
  slug: string;
  nameEN: string;
  nameFR: string;
  stopsEN: string;
  stopsFR: string;
}

export const tourInfo: Record<string, TourInfo> = {
  'left-bank': {
    slug: 'left-bank',
    nameEN: 'Left Bank WWII Tour',
    nameFR: 'Visite Rive Gauche',
    stopsEN: 'Panthéon · Sorbonne · Notre-Dame',
    stopsFR: 'Panthéon · Sorbonne · Notre-Dame',
  },
  'right-bank': {
    slug: 'right-bank',
    nameEN: 'Right Bank WWII Tour',
    nameFR: 'Visite Rive Droite',
    stopsEN: 'Pont Alexandre III · Concorde · Vendôme',
    stopsFR: 'Pont Alexandre III · Concorde · Vendôme',
  },
  'both': {
    slug: 'both',
    nameEN: 'Both Tours (Left Bank + Right Bank)',
    nameFR: 'Les deux visites (Rive Gauche + Rive Droite)',
    stopsEN: 'All 8 historic stops',
    stopsFR: 'Les 8 arrêts historiques',
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
