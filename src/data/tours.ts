export interface TopicImage {
  src: string;
  alt: string;
  objectPosition?: string;
}

export interface StopImage {
  src: string;
  alt: string;
  objectPosition?: string;
}

export interface GalleryImage {
  src: string;
  alt: string;
}

export interface CrossLink {
  slug: string;
  bookingKey: string;
  descriptionEn: string;
  descriptionFr: string;
}

export interface TourConfig {
  slug: string;
  translationPrefix: string;
  heroImageKey: 'left-bank' | 'right-bank';
  heroAlt: string;
  ogImage: string;
  breadcrumbKey: string;
  topics: TopicImage[];
  stops: StopImage[];
  galleryDesktop: GalleryImage[];
  galleryMobile: GalleryImage[];
  crossLink: CrossLink;
  locationName: string;
  galleryAutoPlayMs?: number;
}

export const tours: Record<string, TourConfig> = {
  'left-bank': {
    slug: 'left-bank',
    translationPrefix: 'leftBank',
    heroImageKey: 'left-bank',
    heroAlt: 'Pantheon de Paris - Memorial to Resistance heroes',
    ogImage: '/photos/left_bank/Paris_WW2_tour_guided_group_photo_2.webp',
    breadcrumbKey: 'leftBank',
    topics: [
      { src: '/photos/fall_of_paris_ww2_1940.webp', alt: 'Fall of Paris 1940' },
      { src: '/photos/resistance_ww2_paris.webp', alt: 'Resistance in Paris' },
      { src: '/photos/paris_ww2_liberation_1944_de_gaulle.webp', alt: 'Liberation of Paris 1944' },
    ],
    stops: [
      { src: '/photos/left_bank/Paris_WW2_bullet_holes_2.webp', alt: 'Boulevard Saint-Michel area' },
      { src: '/photos/left_bank/luxembourg_palace_paris.webp', alt: 'Palais du Luxembourg during occupation' },
      { src: '/photos/left_bank/sorbonne_paris.webp', alt: 'Resistance memorial at Sorbonne', objectPosition: 'center top' },
      { src: '/photos/left_bank/notre-dame-de-paris.webp', alt: 'Liberation barricades near Notre-Dame' },
    ],
    galleryDesktop: [
      { src: '/photos/left_bank/Paris_WW2_bullet_holes_2.webp', alt: 'Bullet holes from the war' },
      { src: '/photos/left_bank/Paris_WW2_german_attack.webp', alt: 'German attack on Paris' },
      { src: '/photos/left_bank/Paris_ww2_group_photo.webp', alt: 'Tour group photo' },
      { src: '/photos/left_bank/Paris_WW2_guide.webp', alt: 'Your guide Clement' },
      { src: '/photos/left_bank/Paris_WW2_last_stop.webp', alt: 'Final stop of the tour' },
      { src: '/photos/left_bank/Paris_WW2_resistance.webp', alt: 'Resistance memorial' },
      { src: '/photos/left_bank/Paris_WW2_tour_guided_group_photo_2.webp', alt: 'Another group photo' },
      { src: '/photos/left_bank/Paris_WW2_tour_guided_group_photo_3.webp', alt: 'Group enjoying the tour' },
    ],
    galleryMobile: [
      { src: '/photos/left_bank/Paris_WW2_bullet_holes_2.webp', alt: 'Bullet holes from the war' },
      { src: '/photos/left_bank/Paris_WW2_german_attack.webp', alt: 'German attack on Paris' },
      { src: '/photos/left_bank/Paris_ww2_group_photo.webp', alt: 'Tour group photo' },
      { src: '/photos/left_bank/Paris_WW2_guide.webp', alt: 'Your guide Clement' },
      { src: '/photos/left_bank/Paris_WW2_last_stop.webp', alt: 'Final stop of the tour' },
      { src: '/photos/left_bank/Paris_WW2_resistance.webp', alt: 'Resistance memorial' },
      { src: '/photos/left_bank/Paris_WW2_tour_guided_group_photo_2.webp', alt: 'Another group photo' },
      { src: '/photos/left_bank/Paris_WW2_tour_guided_group_photo_3.webp', alt: 'Group enjoying the tour' },
    ],
    crossLink: {
      slug: 'right-bank',
      bookingKey: 'rightBankTour',
      descriptionEn: 'Complete your experience with the Right Bank tour: Place Vendome, Concorde, and the Liberation stories.',
      descriptionFr: 'Completez votre experience avec la visite Rive Droite : Place Vendome, Concorde et les histoires de la Liberation.',
    },
    locationName: 'Left Bank, Paris, France',
    galleryAutoPlayMs: 6000,
  },
  'right-bank': {
    slug: 'right-bank',
    translationPrefix: 'rightBank',
    heroImageKey: 'right-bank',
    heroAlt: 'Place Vendome - Historic square in Paris',
    ogImage: '/photos/right_bank/vendome_square_group_photo_tour.webp',
    breadcrumbKey: 'rightBank',
    topics: [
      { src: '/photos/right_bank/Hitler-Paris.webp', alt: 'Fall of Paris 1940', objectPosition: '70% 60%' },
      { src: '/photos/right_bank/paris_occupation_signs.webp', alt: 'Resistance in Paris', objectPosition: '70% 5%' },
      { src: '/photos/right_bank/Ernest-Hemingway.webp', alt: 'Liberation of Paris 1944', objectPosition: '70% 5%' },
    ],
    stops: [
      { src: '/photos/right_bank/bridge_alexander_third_paris.webp', alt: 'Bridge Alexander III area', objectPosition: 'center top' },
      { src: '/photos/right_bank/quai_orsay_paris.webp', alt: 'Ministry of Foreign Affairs during occupation', objectPosition: 'center top' },
      { src: '/photos/right_bank/place_concorde_paris.webp', alt: 'Resistance activities at Concorde Square', objectPosition: 'center top' },
      { src: '/photos/right_bank/place_vendome_paris_day.webp', alt: 'Liberation at Place Vendome', objectPosition: 'center top' },
    ],
    galleryDesktop: [
      { src: '/photos/right_bank/vendome_square_map_ww2.webp', alt: 'Historical traces from the war' },
      { src: '/photos/right_bank/vendome_square_group_photo_tour.webp', alt: 'German occupation of Paris' },
      { src: '/photos/right_bank/vendome_square_group_picture.webp', alt: 'Tour group photo' },
      { src: '/photos/right_bank/vendome_square_guide_ww2.webp', alt: 'Your guide Clement' },
      { src: '/photos/right_bank/concorde_square_group_tour_ww2.webp', alt: 'Final stop of the tour' },
      { src: '/photos/right_bank/concorde_square_group_tour_resistance.webp', alt: 'Resistance memorial' },
      { src: '/photos/right_bank/bridge_alexander_third_tour.webp', alt: 'Another group photo' },
      { src: '/photos/right_bank/ww2_tour_introduction.webp', alt: 'Group enjoying the tour' },
    ],
    galleryMobile: [
      { src: '/photos/right_bank/vendome_square_map_ww2.webp', alt: 'Historical traces from the war' },
      { src: '/photos/right_bank/vendome_square_group_photo_tour.webp', alt: 'German occupation of Paris' },
      { src: '/photos/right_bank/vendome_square_group_picture.webp', alt: 'Tour group photo' },
      { src: '/photos/right_bank/vendome_square_guide_ww2.webp', alt: 'Your guide Clement' },
      { src: '/photos/right_bank/concorde_square_group_tour_ww2.webp', alt: 'Final stop of the tour' },
      { src: '/photos/right_bank/concorde_square_group_tour_resistance.webp', alt: 'Resistance memorial' },
      { src: '/photos/right_bank/bridge_alexander_third_tour.webp', alt: 'Another group photo' },
      { src: '/photos/right_bank/ww2_tour_introduction.webp', alt: 'Group enjoying the tour' },
    ],
    crossLink: {
      slug: 'left-bank',
      bookingKey: 'leftBankTour',
      descriptionEn: 'Complete your experience with the Left Bank tour: Pantheon, Sorbonne, Notre-Dame, and the Resistance stories.',
      descriptionFr: 'Completez votre experience avec la visite Rive Gauche : Pantheon, Sorbonne, Notre-Dame et les histoires de la Resistance.',
    },
    locationName: 'Right Bank, Paris, France',
  },
};
