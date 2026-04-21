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
  caption?: string;
}

export interface CrossLink {
  slug: string;
  bookingKey: string;
  descriptionEn: string;
  descriptionFr: string;
}

export interface BookingLinks {
  getyourguide?: string;
  viator?: string;
  tripadvisor?: string;
  parisjetaime?: string;
  tourist?: string;
  whatsapp: string;
  email: string;
}

export interface CoGuide {
  /** Stable id used to look up bio/role in translations under quiet.tour.coGuide.${id}.* */
  id: string;
  /** Public path to the guide portrait (in public/photos/...) */
  photo: string;
}

export interface PartnerShop {
  /** Translation key suffix: quiet.tour.foodWine.shops.${key}.name etc. */
  key: string;
  /** Public-facing URL (often an Instagram profile) */
  url: string;
  /** Public path to a photo of the shop or its product */
  photo: string;
  /** Alt text for the photo */
  photoAlt: string;
}

export interface TourConfig {
  slug: string;
  translationPrefix: string;
  heroImageKey: 'left-bank' | 'right-bank' | 'general-history' | 'food-wine';
  heroAlt: string;
  ogImage: string;
  breadcrumbKey: string;
  themeKeys: readonly string[];
  stopCount: number;
  topics: TopicImage[];
  stops: StopImage[];
  galleryDesktop: GalleryImage[];
  galleryMobile: GalleryImage[];
  crossLinks: CrossLink[];
  locationName: string;
  galleryAutoPlayMs?: number;
  bookingLinks: BookingLinks;
  /** Optional: one or more co-guides to feature in a dedicated section. */
  coGuides?: CoGuide[];
  /** Optional: partner shops highlighted on the tour (food-wine). */
  partnerShops?: PartnerShop[];
  /** Optional: credit the photographer for the tour's imagery. */
  photoCredit?: {
    handle: string;
    url: string;
  };
}

export const tours: Record<string, TourConfig> = {
  'left-bank': {
    slug: 'left-bank',
    translationPrefix: 'leftBank',
    heroImageKey: 'left-bank',
    heroAlt: 'Pantheon de Paris - Memorial to Resistance heroes',
    ogImage: '/photos/left_bank/Paris_WW2_tour_guided_group_photo_2.webp',
    breadcrumbKey: 'leftBank',
    themeKeys: ['fall', 'resistance', 'liberation'],
    stopCount: 4,
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
    crossLinks: [
      {
        slug: 'right-bank',
        bookingKey: 'rightBankTour',
        descriptionEn: 'Complete your WWII experience with the Right Bank tour: Place Vendôme, Concorde, and the Liberation stories.',
        descriptionFr: 'Complétez votre expérience avec la visite Rive Droite : Place Vendôme, Concorde et les histoires de la Libération.',
      },
      {
        slug: 'general-history',
        bookingKey: 'generalHistoryTour',
        descriptionEn: 'Explore 2,000 years of Paris history: from Roman Lutetia to the Viking siege to the French Revolution.',
        descriptionFr: 'Explorez 2 000 ans d\'histoire de Paris : de Lutèce romaine au siège viking jusqu\'à la Révolution française.',
      },
    ],
    locationName: 'Left Bank, Paris, France',
    galleryAutoPlayMs: 6000,
    bookingLinks: {
      getyourguide: 'https://www.getyourguide.com/paris-l16/world-war-ii-tour-in-paris-fall-resistance-liberation-t537162/',
      viator: 'https://www.viator.com/tours/Paris/World-War-II-Tour-in-Paris-Fall-Resistance-and-Liberation/d479-5642691P2',
      tripadvisor: 'https://www.tripadvisor.fr/Attraction_Review-g187147-d34229671-Reviews-Paris_History_Tours-Paris_Ile_de_France.html',
      parisjetaime: 'https://parisjetaime.com/activite/Paris-history-tours-p4833',
      tourist: 'https://tourist.com/p/24194',
      whatsapp: 'https://wa.me/+33620622480',
      email: 'mailto:clemdaguetschott@gmail.com',
    },
  },
  'right-bank': {
    slug: 'right-bank',
    translationPrefix: 'rightBank',
    heroImageKey: 'right-bank',
    heroAlt: 'Place Vendome - Historic square in Paris',
    ogImage: '/photos/right_bank/vendome_square_group_photo_tour.webp',
    breadcrumbKey: 'rightBank',
    themeKeys: ['fall', 'resistance', 'liberation'],
    stopCount: 4,
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
    crossLinks: [
      {
        slug: 'left-bank',
        bookingKey: 'leftBankTour',
        descriptionEn: 'Complete your WWII experience with the Left Bank tour: Panthéon, Sorbonne, Notre-Dame, and the Resistance stories.',
        descriptionFr: 'Complétez votre expérience avec la visite Rive Gauche : Panthéon, Sorbonne, Notre-Dame et les histoires de la Résistance.',
      },
      {
        slug: 'general-history',
        bookingKey: 'generalHistoryTour',
        descriptionEn: 'Explore 2,000 years of Paris history: from Roman Lutetia to the Viking siege to the French Revolution.',
        descriptionFr: 'Explorez 2 000 ans d\'histoire de Paris : de Lutèce romaine au siège viking jusqu\'à la Révolution française.',
      },
    ],
    locationName: 'Right Bank, Paris, France',
    bookingLinks: {
      getyourguide: 'https://www.getyourguide.com/paris-l16/world-war-ii-tour-in-paris-fall-resistance-liberation-t537162/',
      viator: 'https://www.viator.com/tours/Paris/World-War-II-Tour-in-Paris-Fall-Resistance-and-Liberation/d479-5642691P2',
      tripadvisor: 'https://www.tripadvisor.fr/Attraction_Review-g187147-d34229671-Reviews-Paris_History_Tours-Paris_Ile_de_France.html',
      parisjetaime: 'https://parisjetaime.com/activite/Paris-history-tours-p4833',
      tourist: 'https://tourist.com/p/24194',
      whatsapp: 'https://wa.me/+33620622480',
      email: 'mailto:clemdaguetschott@gmail.com',
    },
  },
  'general-history': {
    slug: 'general-history',
    translationPrefix: 'generalHistory',
    heroImageKey: 'general-history',
    heroAlt: 'Ile de la Cité - Heart of Paris since the Gauls',
    ogImage: '/photos/general_history/og_general_history.webp',
    breadcrumbKey: 'generalHistory',
    themeKeys: ['roman', 'medieval', 'revolution'],
    stopCount: 3,
    topics: [
      { src: '/photos/general_history/theme_roman_paris.webp', alt: 'Roman Paris - Lutetia' },
      { src: '/photos/general_history/theme_medieval_paris.webp', alt: 'Viking siege of Paris 885' },
      { src: '/photos/general_history/theme_revolution_paris.webp', alt: 'French Revolution - Flight to Varennes' },
    ],
    stops: [
      { src: '/photos/general_history/stop1_thermes_cluny.webp', alt: 'Thermes de Cluny - Roman baths of Paris' },
      { src: '/photos/general_history/stop2_ile_cite.webp', alt: 'Ile de la Cité - Medieval Paris' },
      { src: '/photos/general_history/stop3_tuileries.webp', alt: 'Tuileries Garden - Site of the royal palace' },
    ],
    galleryDesktop: [
      { src: '/photos/general_history/gallery_1.webp', alt: 'Tour group at the Roman baths' },
      { src: '/photos/general_history/gallery_2.webp', alt: 'Guide explaining Paris history' },
      { src: '/photos/general_history/gallery_3.webp', alt: 'Historical map of Paris' },
      { src: '/photos/general_history/gallery_4.webp', alt: 'Ile de la Cité panoramic view' },
      { src: '/photos/general_history/gallery_5.webp', alt: 'Medieval Paris reconstruction' },
      { src: '/photos/general_history/gallery_6.webp', alt: 'Group photo at Tuileries' },
      { src: '/photos/general_history/gallery_7.webp', alt: 'French Revolution anecdote spot' },
      { src: '/photos/general_history/gallery_8.webp', alt: 'Tour conclusion' },
    ],
    galleryMobile: [
      { src: '/photos/general_history/gallery_1.webp', alt: 'Tour group at the Roman baths' },
      { src: '/photos/general_history/gallery_2.webp', alt: 'Guide explaining Paris history' },
      { src: '/photos/general_history/gallery_3.webp', alt: 'Historical map of Paris' },
      { src: '/photos/general_history/gallery_4.webp', alt: 'Ile de la Cité panoramic view' },
      { src: '/photos/general_history/gallery_5.webp', alt: 'Medieval Paris reconstruction' },
      { src: '/photos/general_history/gallery_6.webp', alt: 'Group photo at Tuileries' },
      { src: '/photos/general_history/gallery_7.webp', alt: 'French Revolution anecdote spot' },
      { src: '/photos/general_history/gallery_8.webp', alt: 'Tour conclusion' },
    ],
    crossLinks: [
      {
        slug: 'left-bank',
        bookingKey: 'leftBankTour',
        descriptionEn: 'Dive deeper into WWII Paris with the Left Bank tour: Panthéon, Sorbonne, Notre-Dame, and the Resistance stories.',
        descriptionFr: 'Plongez dans le Paris de la Seconde Guerre mondiale avec la visite Rive Gauche : Panthéon, Sorbonne, Notre-Dame et la Résistance.',
      },
      {
        slug: 'right-bank',
        bookingKey: 'rightBankTour',
        descriptionEn: 'Discover WWII Paris on the Right Bank: Pont Alexandre III, Concorde, Place Vendôme. Art theft, Hemingway & Liberation.',
        descriptionFr: 'Découvrez le Paris de la Seconde Guerre mondiale Rive Droite : Pont Alexandre III, Concorde, Place Vendôme.',
      },
    ],
    locationName: 'Central Paris, France',
    galleryAutoPlayMs: 6000,
    bookingLinks: {
      tripadvisor: 'https://www.tripadvisor.fr/Attraction_Review-g187147-d34229671-Reviews-Paris_History_Tours-Paris_Ile_de_France.html',
      parisjetaime: 'https://parisjetaime.com/activite/Paris-history-tours-p4833',
      tourist: 'https://tourist.com/p/24194',
      whatsapp: 'https://wa.me/+33620622480',
      email: 'mailto:clemdaguetschott@gmail.com',
    },
  },
  'food-wine': {
    slug: 'food-wine',
    translationPrefix: 'foodWine',
    heroImageKey: 'food-wine',
    heroAlt: 'Nourritour — table de dégustation fromages, charcuteries et vins',
    ogImage: '/photos/food_and_wine/nourritour-salle-degustation-table-fromages-charcuterie.webp',
    breadcrumbKey: 'foodWine',
    themeKeys: ['story', 'terroir', 'pairing'],
    stopCount: 4,
    // Topics = 3 theme images, one per theme
    topics: [
      { src: '/photos/food_and_wine/nourritour-guide-explique-groupe-sebastien-gaudard.webp', alt: 'Guide racontant l\'histoire des passages et de la gastronomie parisienne' },
      { src: '/photos/food_and_wine/nourritour-fromages-tomme-chevre-fromagerie.webp',       alt: 'Fromages de terroir français — tomme et chèvre' },
      { src: '/photos/food_and_wine/nourritour-coupe-bulles-flaconneurs-servie.webp',        alt: 'Verre de vin servi pour la dégustation' },
    ],
    // 4 artisan stops: Madlen → Chataigner → Thielen → Flaconneurs.
    // (Passage Verdeau is the meeting point — rendered as a 5th pin on the map only.)
    stops: [
      { src: '/photos/food_and_wine/nourritour-madeleines-glacees-assorties-patisserie.webp', alt: 'Maison Madlen — madeleines glacées assorties' },
      { src: '/photos/food_and_wine/nourritour-fromages-tomme-chevre-fromagerie.webp',        alt: 'Fromagerie Chataigner — fromages affinés de la rue des Martyrs' },
      { src: '/photos/food_and_wine/nourritour-saucissons-artisanaux-la-tablee.webp',         alt: 'Charcuterie Maison Thielen — saucissons artisanaux' },
      { src: '/photos/food_and_wine/nourritour-service-bulles-degustation-flaconneurs.webp',  alt: 'Les Flaconneurs — dégustation guidée de vins' },
    ],
    galleryDesktop: [
      { src: '/photos/food_and_wine/nourritour-salle-degustation-table-fromages-charcuterie.webp', alt: 'La table de dégustation installée' },
      { src: '/photos/food_and_wine/nourritour-guide-baguettes-discussion-groupe.webp',            alt: 'Échange avec le groupe, baguettes en main' },
      { src: '/photos/food_and_wine/nourritour-participants-degustation-attentifs.webp',           alt: 'Participants attentifs pendant la dégustation' },
      { src: '/photos/food_and_wine/nourritour-charcuterie-iberique-lomo-degustation.webp',        alt: 'Planche de charcuterie ibérique — lomo' },
      { src: '/photos/food_and_wine/nourritour-guide-indique-boutique-rue-martyrs.webp',           alt: 'Sur la rue des Martyrs, entre deux artisans' },
      { src: '/photos/food_and_wine/nourritour-groupe-participants-devant-altermundi.webp',        alt: 'Le groupe au fil du parcours' },
      { src: '/photos/food_and_wine/nourritour-coupe-bulles-flaconneurs-servie.webp',              alt: 'Un verre servi au caviste' },
      { src: '/photos/food_and_wine/nourritour-guide-montre-boutique-rue-martyrs.webp',            alt: 'Le guide raconte une boutique' },
    ],
    galleryMobile: [
      { src: '/photos/food_and_wine/nourritour-salle-degustation-table-fromages-charcuterie.webp', alt: 'La table de dégustation installée' },
      { src: '/photos/food_and_wine/nourritour-guide-baguettes-discussion-groupe.webp',            alt: 'Échange avec le groupe, baguettes en main' },
      { src: '/photos/food_and_wine/nourritour-participants-degustation-attentifs.webp',           alt: 'Participants attentifs pendant la dégustation' },
      { src: '/photos/food_and_wine/nourritour-charcuterie-iberique-lomo-degustation.webp',        alt: 'Planche de charcuterie ibérique — lomo' },
      { src: '/photos/food_and_wine/nourritour-guide-indique-boutique-rue-martyrs.webp',           alt: 'Sur la rue des Martyrs, entre deux artisans' },
      { src: '/photos/food_and_wine/nourritour-coupe-bulles-flaconneurs-servie.webp',              alt: 'Un verre servi au caviste' },
    ],
    crossLinks: [
      {
        slug: 'left-bank',
        bookingKey: 'leftBankTour',
        descriptionEn: 'Prefer history? Dive into WWII Paris with the Left Bank tour — Pantheon, Sorbonne, Notre-Dame, and the Resistance.',
        descriptionFr: 'Plutôt histoire ? Plongez dans le Paris de la Seconde Guerre Rive Gauche — Panthéon, Sorbonne, Notre-Dame et la Résistance.',
      },
      {
        slug: 'general-history',
        bookingKey: 'generalHistoryTour',
        descriptionEn: 'For a broader sweep: 2,000 years of Paris history — Roman Lutetia, Viking siege, the Revolution.',
        descriptionFr: 'Pour un panorama plus large : 2 000 ans d\'histoire parisienne — Lutèce romaine, siège viking, Révolution.',
      },
    ],
    locationName: '9th Arrondissement, Paris, France',
    bookingLinks: {
      // No GetYourGuide/Viator listing yet — WhatsApp + direct booking only for now
      tripadvisor: 'https://www.tripadvisor.fr/Attraction_Review-g187147-d34229671-Reviews-Paris_History_Tours-Paris_Ile_de_France.html',
      whatsapp: 'https://wa.me/+33620622480',
      email: 'mailto:clemdaguetschott@gmail.com',
    },
    coGuides: [
      { id: 'clement', photo: '/photos/food_and_wine/nourritour-guide-baguettes-sourire-rue.webp' },
      { id: 'amelie',  photo: '/photos/food_and_wine/nourritour-sommeliere-carte-france-vins.webp' },
    ],
    photoCredit: {
      handle: '@florian.c_photographie',
      url: 'https://www.instagram.com/florian.c_photographie/',
    },
    partnerShops: [
      {
        key: 'madlen',
        url: 'https://www.instagram.com/maisonmadlen/',
        photo: '/photos/food_and_wine/nourritour-madlen-devanture-madeleines-modernes-paris.webp',
        photoAlt: 'Maison Madlen — devanture rue Cadet',
      },
      {
        key: 'chataigner',
        url: 'https://www.instagram.com/fromageriechataigner/',
        photo: '/photos/food_and_wine/nourritour-fromagerie-chataigner-devanture-paris.webp',
        photoAlt: 'Fromagerie Chataigner — devanture rue des Martyrs',
      },
      {
        key: 'thielen',
        url: 'https://www.instagram.com/maisonthielen/',
        photo: '/photos/food_and_wine/nourritour-maison-thielen-charcutier-traiteur-devanture.webp',
        photoAlt: 'Charcuterie Maison Thielen — devanture rue des Martyrs',
      },
      {
        key: 'flaconneurs',
        url: 'https://www.instagram.com/lesflaconneurs/',
        photo: '/photos/food_and_wine/nourritour-les-flaconneurs-marchand-vins-devanture.webp',
        photoAlt: 'Les Flaconneurs — devanture rue de Maubeuge',
      },
    ],
  },
};
