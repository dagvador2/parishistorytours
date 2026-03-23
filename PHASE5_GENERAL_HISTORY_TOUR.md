# Phase 5 — Nouvelle page : General History of Paris Tour

> **Objectif** : Ajouter une troisième visite guidée « General History of Paris » au site. Page identique en structure aux tours Left Bank et Right Bank existants, avec son propre contenu, ses propres traductions, et intégrée dans la navigation, le booking, le SEO et les cross-links.
>
> **Pitch** : "2 000 ans d'histoire en 2h" — 3 arrêts couvrant la période gallo-romaine, le Moyen Âge (siège viking de 885) et la Révolution française (fuite de Varennes).

---

## Architecture existante (référence)

Le template unique `src/pages/tours/[tour].astro` génère les pages via `getStaticPaths()`. Chaque tour est configuré dans `src/data/tours.ts` (images, slugs, cross-links) et ses textes vivent dans `src/i18n/translations/en.ts` / `fr.ts`. La carte Mapbox est dans `src/components/TourMap.tsx`.

**Sections de la page tour (dans l'ordre)** :
1. Hero (image plein écran + titre + badge durée/distance/stops)
2. Introduction (titre + citation + résumé)
3. Did You Know? (faits historiques)
4. Three Historical Themes (3 cartes avec image + titre + description)
5. Our 3 Historic Stops (alternance gauche/droite desktop, carousel mobile)
6. Tour Route (carte Mapbox avec markers numérotés + route)
7. Experience the History (galerie photo)
8. Book Your Tour (composant BookTour)
9. Discover Our Other Tours (cross-links vers les 2 autres tours)
10. FAQ
11. JSON-LD TouristTrip

---

## Tâche 1 : Ajouter le slug dans `getStaticPaths`

**Fichier** : `src/pages/tours/[tour].astro`

Ajouter `'general-history'` dans `getStaticPaths()` :

```typescript
export function getStaticPaths() {
  return [
    { params: { tour: 'left-bank' } },
    { params: { tour: 'right-bank' } },
    { params: { tour: 'general-history' } },
  ];
}
```

Ajouter l'import de l'image hero dans le bloc des heroImages :

```typescript
import ileDeLaCite from "../../images/ile_de_la_cite_paris.webp"; // PLACEHOLDER — Clément fournira

const heroImages: Record<string, ImageMetadata> = {
  'left-bank': pantheon,
  'right-bank': vendome,
  'general-history': ileDeLaCite,
};
```

> **Photo placeholder** : `src/images/ile_de_la_cite_paris.webp` — Clément fournira la vraie photo hero.

---

## Tâche 2 : Ajouter la config dans `src/data/tours.ts`

### 2a. Mettre à jour l'interface `TourConfig`

Le type `heroImageKey` doit accepter la nouvelle valeur :

```typescript
heroImageKey: 'left-bank' | 'right-bank' | 'general-history';
```

### 2b. Adapter le `themeKeys`

Actuellement dans `[tour].astro` :
```typescript
const themeKeys = ['fall', 'resistance', 'liberation'] as const;
```

Le nouveau tour a des thèmes différents. Il faut rendre `themeKeys` configurable par tour. **Deux options** :

**Option A (recommandée)** — Ajouter `themeKeys` dans `TourConfig` :
```typescript
export interface TourConfig {
  // ... existant
  themeKeys: readonly string[];
}
```

Puis dans `[tour].astro` :
```typescript
const themeKeys = tourConfig.themeKeys;
```

Les tours WWII garderont `['fall', 'resistance', 'liberation']`. Le nouveau tour aura `['roman', 'medieval', 'revolution']`.

**Option B** — Utiliser un préfixe de thème par tour (plus de refactoring, moins clean).

→ **Choisir l'option A.**

### 2c. Adapter le nombre de stops

Les tours WWII ont 4 stops. Le General History tour a 3 stops. Il faut rendre le nombre de stops dynamique.

Ajouter dans `TourConfig` :
```typescript
export interface TourConfig {
  // ... existant
  themeKeys: readonly string[];
  stopCount: number; // 3 ou 4
}
```

Puis dans `[tour].astro`, remplacer les hardcoded `4` :
- Section stops : itérer sur `tourConfig.stops` (déjà dynamique ✓)
- Carousel indicators : générer dynamiquement au lieu de 4 boutons hardcodés
- JSON-LD `numberOfItems` : utiliser `tourConfig.stopCount`
- Section title : utiliser une clé dynamique (`our3Stops` ou `our4Stops`)

### 2d. Le bloc de config `general-history`

```typescript
'general-history': {
  slug: 'general-history',
  translationPrefix: 'generalHistory',
  heroImageKey: 'general-history',
  heroAlt: 'Ile de la Cité - Heart of Paris since the Gauls',
  ogImage: '/photos/general_history/PLACEHOLDER_hero.webp',
  breadcrumbKey: 'generalHistory',
  themeKeys: ['roman', 'medieval', 'revolution'],
  stopCount: 3,
  topics: [
    { src: '/photos/general_history/PLACEHOLDER_roman.webp', alt: 'Roman Paris - Lutetia' },
    { src: '/photos/general_history/PLACEHOLDER_medieval.webp', alt: 'Viking siege of Paris 885' },
    { src: '/photos/general_history/PLACEHOLDER_revolution.webp', alt: 'French Revolution - Flight to Varennes' },
  ],
  stops: [
    { src: '/photos/general_history/PLACEHOLDER_stop1_thermes_cluny.webp', alt: 'Thermes de Cluny - Roman baths of Paris' },
    { src: '/photos/general_history/PLACEHOLDER_stop2_ile_cite.webp', alt: 'Ile de la Cité - Medieval Paris' },
    { src: '/photos/general_history/PLACEHOLDER_stop3_tuileries.webp', alt: 'Tuileries Garden - Site of the royal palace' },
  ],
  galleryDesktop: [
    { src: '/photos/general_history/PLACEHOLDER_gallery_1.webp', alt: 'Tour group at the Roman baths' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_2.webp', alt: 'Guide explaining Paris history' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_3.webp', alt: 'Historical map of Paris' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_4.webp', alt: 'Ile de la Cité panoramic view' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_5.webp', alt: 'Medieval Paris reconstruction' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_6.webp', alt: 'Group photo at Tuileries' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_7.webp', alt: 'French Revolution anecdote spot' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_8.webp', alt: 'Tour conclusion' },
  ],
  galleryMobile: [
    { src: '/photos/general_history/PLACEHOLDER_gallery_1.webp', alt: 'Tour group at the Roman baths' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_2.webp', alt: 'Guide explaining Paris history' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_3.webp', alt: 'Historical map of Paris' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_4.webp', alt: 'Ile de la Cité panoramic view' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_5.webp', alt: 'Medieval Paris reconstruction' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_6.webp', alt: 'Group photo at Tuileries' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_7.webp', alt: 'French Revolution anecdote spot' },
    { src: '/photos/general_history/PLACEHOLDER_gallery_8.webp', alt: 'Tour conclusion' },
  ],
  crossLinks: [
    {
      slug: 'left-bank',
      bookingKey: 'leftBankTour',
      descriptionEn: 'Dive deeper into WWII Paris with the Left Bank tour: Pantheon, Sorbonne, Notre-Dame, and the Resistance stories.',
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
},
```

> **Note** : Le champ `crossLink` (singulier) doit devenir `crossLinks` (pluriel, array) pour supporter 2+ cross-links. **Mettre à jour les configs left-bank et right-bank** pour aussi avoir un array de 2 cross-links chacun (vers les 2 autres tours).

### 2e. Mettre à jour les cross-links des tours existants

**left-bank** — remplacer `crossLink` par `crossLinks` :
```typescript
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
```

**right-bank** — idem, adapter pour pointer vers left-bank + general-history.

### 2f. Refactorer la section cross-link dans `[tour].astro`

Remplacer la section "Cross-link to other tour" (singulier) par un mapping sur `tourConfig.crossLinks` :

```astro
<!-- Discover our other tours -->
<section class="py-12 bg-gray-100">
  <div class="max-w-4xl mx-auto px-4 text-center">
    <h2 class="text-2xl font-bold text-gray-800 mb-8">
      {t('tours.discoverOtherTours')}
    </h2>
    <div class="grid md:grid-cols-2 gap-6">
      {tourConfig.crossLinks.map((link) => (
        <div class="bg-white rounded-lg shadow p-6">
          <p class="text-gray-600 mb-4">
            {lang === 'fr' ? link.descriptionFr : link.descriptionEn}
          </p>
          <a href={`${langPrefix}/tours/${link.slug}`}
             class="inline-block bg-gray-800 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition font-medium">
            {t(`booking.${link.bookingKey}`)} →
          </a>
        </div>
      ))}
    </div>
  </div>
</section>
```

---

## Tâche 3 : Ajouter les traductions EN

**Fichier** : `src/i18n/translations/en.ts`

### 3a. Clés meta

```typescript
meta: {
  // ... existant
  generalHistory: {
    title: "General History of Paris Tour - 2,000 Years in 2 Hours",
    description: "Walk through 2,000 years of Paris history: Roman Lutetia, the Viking siege of 885, and the French Revolution. 3 stops, 1.5 hours. Small group with a local guide."
  },
},
```

### 3b. Clés common

Adapter la section `common` pour supporter les différences (1.5h au lieu de 2h, 3 stops au lieu de 4, 2.5km). **Option** : rendre les badges dynamiques via les clés de tour plutôt que `common`. Ou ajouter des clés spécifiques :

```typescript
common: {
  // existant
  duration: "2 hours",
  distance: "2.5 km walking",
  stops: "4 historic stops",
  // nouveau — surcharges par tour
  durationGeneralHistory: "1.5 hours",
  distanceGeneralHistory: "2.5 km walking",
  stopsGeneralHistory: "3 historic stops",
},
```

**Mieux** : ajouter `duration`, `distance`, `stopsLabel` dans `TourConfig` directement, et les afficher dans le hero au lieu d'utiliser les clés `common`. Cela évite la multiplication des clés i18n.

### 3c. Clés tours — thèmes

Les thèmes actuels (`fall`, `resistance`, `liberation`) sont spécifiques au WWII. Ajouter les thèmes du General History tour :

```typescript
tours: {
  themes: {
    // existant (WWII)
    title: "Three Historical Themes on WW2",
    fall: { ... },
    resistance: { ... },
    liberation: { ... },
    // nouveau (General History)
    roman: {
      title: "Roman Paris",
      description: "Discover the origins of Paris as Lutetia, a Gallic settlement conquered by Rome. From the fierce battle of 52 BC to 300 years of Pax Romana, explore how the Romans shaped the city with baths, forums, and theaters."
    },
    medieval: {
      title: "Medieval Paris",
      description: "Experience the dramatic Viking siege of 885-886, when 700 ships carrying 10,000 warriors laid siege to the Île de la Cité. Follow the eyewitness account of the monk Abbon and the heroic defense led by Count Eudes."
    },
    revolution: {
      title: "The French Revolution",
      description: "Relive the night of June 20, 1791, when Louis XVI and Marie Antoinette attempted their daring escape from Paris — a comedy of errors with dramatic consequences that sealed the fate of the French monarchy."
    },
  },
  // ...
}
```

**Important** : Le titre de la section thèmes est actuellement hardcodé `"Three Historical Themes on WW2"`. Il faut le rendre dynamique par tour :

```typescript
tours: {
  themes: {
    titleWW2: "Three Historical Themes on WW2",
    titleGeneralHistory: "Three Eras of Paris History",
    // ...
  }
}
```

Ou mieux, ajouter `themeSectionTitle` dans `TourConfig`.

### 3d. Clés tours — contenu General History

```typescript
tours: {
  // ...
  generalHistory: {
    title: "General History of Paris",
    description: "2,000 years of Parisian history in one walk",
    introduction: "A Journey Through Time",
    quote: "To know Paris is to know a great deal of France.",
    quoteAuthor: "Victor Hugo",
    summary: "This tour takes you on a journey spanning nearly 2,000 years of Parisian history. Across three stops and three distinct eras, you'll discover the fierce battle that gave Rome control of Lutetia, the terrifying Viking siege that forged a new dynasty, and the royal escape attempt that sealed the fate of the French monarchy.",
    didYouKnow: {
      title: "Did You Know? Fascinating Facts About Paris History",
      facts: [
        "The Parisii, the Gallic tribe who gave Paris its name, minted their own gold coins featuring a stylized head of Apollo on one side and a horse with a net above its head on the other.",
        "In 52 BC, the Gauls destroyed both bridges connecting the Île de la Cité to prevent the Roman general Labienus from reaching their fortress — but his brilliant overnight river crossing outmaneuvered them.",
        "The Roman baths of Cluny, still standing over 13 meters tall near our first stop, were the largest public baths in Roman Lutetia and are among the best-preserved Roman ruins in France.",
        "During the Viking siege of 885-886, the monk Abbon described a fleet of 700 ships covering the Seine — an armada so vast it terrified the 5,000 civilians sheltering on the Île de la Cité.",
        "When Marie Antoinette escaped the Tuileries Palace on the night of June 20, 1791, she crossed paths with Lafayette's carriage, pressed herself against a wall in the dark, then took a wrong turn toward the Seine before doubling back.",
      ]
    },
    stops: {
      stop1: {
        title: "Thermes de Cluny — Roman Lutetia",
        description: "Begin at the imposing Roman baths, still standing after nearly 2,000 years. Here we set the scene: the arrival of the Parisii tribe, their gold coinage, and the dramatic battle of 52 BC where the Roman general Labienus outwitted the Gallic warrior Camulogène with a daring overnight river crossing. Discover how Rome transformed the settlement into a thriving city with forums, theaters, and the road you walked to get here."
      },
      stop2: {
        title: "Île de la Cité — The Viking Siege",
        description: "Standing on the very island where Parisians sheltered during the siege of 885-886, relive the dramatic events through the eyes of the monk Abbon. With only 200 soldiers against 10,000 Vikings, Count Eudes mounted a legendary defense. Experience the heroism, the starvation, and the political betrayal that ended a dynasty and crowned a new king."
      },
      stop3: {
        title: "Tuileries Garden — The Flight to Varennes",
        description: "On the site of the vanished Tuileries Palace, discover the night of June 20, 1791 — when Louis XVI and Marie Antoinette attempted their escape from Revolutionary Paris. A story worthy of a thriller: disguises, near-misses with Lafayette's patrol, a wrong turn in the dark, and a chase through the night that ended in a small-town grocery store."
      }
    }
  },
}
```

### 3e. Clés booking

```typescript
booking: {
  // existant
  leftBank: "Left Bank",
  rightBank: "Right Bank",
  leftBankTour: "Left Bank Tour",
  rightBankTour: "Right Bank Tour",
  // nouveau
  generalHistory: "General History",
  generalHistoryTour: "General History Tour",
},
```

### 3f. Clés stops section

```typescript
tours: {
  stops: {
    our4Stops: "Our 4 Historic Stops",
    our3Stops: "Our 3 Historic Stops", // nouveau
    experienceHistory: "Experience the History",
    ourRoute: "Our Route Through Paris",
  },
}
```

### 3g. Clé cross-links

```typescript
tours: {
  discoverOtherTours: "Discover our other tours", // remplace le texte hardcodé actuel
}
```

---

## Tâche 4 : Ajouter les traductions FR

**Fichier** : `src/i18n/translations/fr.ts`

Mêmes clés qu'en anglais. Voici le contenu FR :

```typescript
generalHistory: {
  title: "Histoire Générale de Paris",
  description: "2 000 ans d'histoire parisienne en une promenade",
  introduction: "Un Voyage à Travers le Temps",
  quote: "Qui connaît Paris connaît le fond des choses humaines.",
  quoteAuthor: "Victor Hugo",
  summary: "Cette visite vous emmène dans un voyage de près de 2 000 ans à travers l'histoire de Paris. En trois arrêts et trois époques distinctes, vous découvrirez la bataille féroce qui donna Rome maîtresse de Lutèce, le terrifiant siège viking qui forgea une nouvelle dynastie, et la tentative d'évasion royale qui scella le destin de la monarchie française.",
  didYouKnow: {
    title: "Le Saviez-Vous ? Faits Fascinants sur l'Histoire de Paris",
    facts: [
      "Les Parisii, la tribu gauloise qui a donné son nom à Paris, frappaient leur propre monnaie en or avec une tête d'Apollon stylisée d'un côté et un cheval avec un filet au-dessus de la tête de l'autre.",
      "En 52 avant J.-C., les Gaulois détruisirent les deux ponts reliant l'Île de la Cité pour empêcher le général romain Labienus d'atteindre leur forteresse — mais sa traversée nocturne du fleuve déjoua leur stratégie.",
      "Les thermes romains de Cluny, toujours debout à plus de 13 mètres de haut près de notre premier arrêt, étaient les plus grands bains publics de Lutèce romaine et comptent parmi les ruines romaines les mieux conservées de France.",
      "Lors du siège viking de 885-886, le moine Abbon décrivit une flotte de 700 navires couvrant la Seine — une armada si vaste qu'elle terrorisa les 5 000 civils réfugiés sur l'Île de la Cité.",
      "Quand Marie-Antoinette s'est échappée du palais des Tuileries dans la nuit du 20 juin 1791, elle a croisé le carrosse de Lafayette, s'est plaquée contre un mur dans l'obscurité, puis a tourné à gauche vers la Seine au lieu de tourner à droite, avant de faire demi-tour.",
    ]
  },
  stops: {
    stop1: {
      title: "Thermes de Cluny — Lutèce Romaine",
      description: "Commencez devant les imposants thermes romains, toujours debout après près de 2 000 ans. Ici, nous plantons le décor : l'arrivée de la tribu des Parisii, leur monnaie d'or, et la bataille dramatique de 52 avant J.-C. où le général romain Labienus déjoua le guerrier gaulois Camulogène par une audacieuse traversée nocturne du fleuve. Découvrez comment Rome transforma ce village en une cité florissante."
    },
    stop2: {
      title: "Île de la Cité — Le Siège Viking",
      description: "Debout sur l'île même où les Parisiens se réfugièrent lors du siège de 885-886, revivez les événements dramatiques à travers les yeux du moine Abbon. Avec seulement 200 soldats face à 10 000 Vikings, le comte Eudes monta une défense légendaire. Vivez l'héroïsme, la famine et la trahison politique qui mit fin à une dynastie et couronna un nouveau roi."
    },
    stop3: {
      title: "Jardin des Tuileries — La Fuite de Varennes",
      description: "Sur le site du palais des Tuileries disparu, découvrez la nuit du 20 juin 1791 — quand Louis XVI et Marie-Antoinette tentèrent leur évasion de Paris révolutionnaire. Une histoire digne d'un thriller : des déguisements, des rencontres manquées de peu avec la patrouille de Lafayette, un mauvais virage dans l'obscurité, et une course-poursuite dans la nuit qui s'acheva dans l'épicerie d'un village."
    }
  }
},
```

Thèmes FR :
```typescript
themes: {
  roman: {
    title: "Paris Romain",
    description: "Découvrez les origines de Paris en tant que Lutèce, colonie gauloise conquise par Rome. De la bataille féroce de 52 avant J.-C. à 300 ans de Pax Romana, explorez comment les Romains ont façonné la ville avec des thermes, forums et théâtres."
  },
  medieval: {
    title: "Paris Médiéval",
    description: "Vivez le dramatique siège viking de 885-886, quand 700 navires portant 10 000 guerriers assiégèrent l'Île de la Cité. Suivez le témoignage oculaire du moine Abbon et la défense héroïque menée par le comte Eudes."
  },
  revolution: {
    title: "La Révolution Française",
    description: "Revivez la nuit du 20 juin 1791, quand Louis XVI et Marie-Antoinette tentèrent leur audacieuse évasion de Paris — une comédie d'erreurs aux conséquences dramatiques qui scella le destin de la monarchie française."
  },
},
```

---

## Tâche 5 : Ajouter la carte Mapbox

**Fichier** : `src/components/TourMap.tsx`

### 5a. Mettre à jour le type `TourMapProps`

```typescript
interface TourMapProps {
  tour: 'left-bank' | 'right-bank' | 'general-history';
}
```

### 5b. Ajouter les stops et waypoints

**Stops principaux** (basés sur le descriptif du tour) :

```typescript
const generalHistoryStops: Stop[] = [
  { name: "Thermes de Cluny", coords: [2.3442, 48.8509], theme: "Roman Lutetia" },
  { name: "Île de la Cité", coords: [2.3470, 48.8534], theme: "The Viking Siege" },
  { name: "Jardin des Tuileries", coords: [2.3275, 48.8635], theme: "The French Revolution" },
];
```

> **Note** : Les coordonnées exactes sont à ajuster. Le stop 1 (Thermes de Cluny) est au 6 Place Paul Painlevé. Le stop 2 est sur l'Île de la Cité (point précis à définir — parvis Notre-Dame ou Pont Neuf par exemple). Le stop 3 est dans le Jardin des Tuileries (côté est, emplacement de l'ancien palais).

**Waypoints** (arrêts rapides mentionnés dans le tour) :

```typescript
const generalHistoryWaypoints = [
  { name: "Rue Saint-Jacques", coords: [2.3440, 48.8490] }, // Cardo Maximus romain
  { name: "Pont Neuf", coords: [2.3415, 48.8568] }, // Transition vers Rive Droite
];
```

### 5c. Ajouter les données de route

Ajouter le centre et le zoom :
```typescript
const centerCoords: [number, number] = tour === 'general-history'
  ? [2.3380, 48.8560] // Centre pour General History
  : tour === 'left-bank' ? ... : ...;
```

### 5d. Mettre à jour la logique de sélection

```typescript
const stops = tour === 'left-bank'
  ? leftBankStops
  : tour === 'right-bank'
    ? rightBankStops
    : generalHistoryStops;
```

---

## Tâche 6 : Adapter le template `[tour].astro`

Plusieurs adaptations nécessaires pour que le template fonctionne avec 3 ou 4 stops, et avec des thèmes différents.

### 6a. Thèmes dynamiques

Remplacer :
```typescript
const themeKeys = ['fall', 'resistance', 'liberation'] as const;
```
Par :
```typescript
const themeKeys = tourConfig.themeKeys;
```

Et le titre de la section thèmes :
```astro
<h2>
  {tourConfig.themeSectionTitle
    ? t(tourConfig.themeSectionTitle)
    : t('tours.themes.title')}
</h2>
```

Ou ajouter `themeSectionTitle` comme clé i18n dans `TourConfig`.

### 6b. Nombre de stops dynamique

**Section titre** :
```astro
<h2>{t(`tours.stops.our${tourConfig.stopCount}Stops`)}</h2>
```

**Carousel indicators (mobile)** — remplacer les 4 boutons hardcodés par :
```astro
{Array.from({ length: tourConfig.stopCount }, (_, i) => (
  <button
    class={`w-3 h-3 rounded-full ${i === 0 ? 'bg-gray-800' : 'bg-gray-300'} transition-all duration-200`}
    data-index={i.toString()}
  ></button>
))}
```

**Topics carousel indicators** — même chose, remplacer les 3 boutons hardcodés par un mapping sur `themeKeys.length`.

**Script carousel init** — le `totalItems` du stops carousel doit être dynamique :
```html
<script define:vars={{ ..., stopCount: tourConfig.stopCount, themeCount: tourConfig.themeKeys.length }}>
  window.__stopCount = stopCount;
  window.__themeCount = themeCount;
</script>
```
```typescript
initCarousel({ carouselId: 'stops-carousel', indicatorsId: 'stops-indicators', totalItems: (window as any).__stopCount });
initCarousel({ carouselId: 'topics-carousel', indicatorsId: 'topics-indicators', totalItems: (window as any).__themeCount });
```

### 6c. Section Hero — durée/distance/stops dynamiques

Les badges hero (durée, distance, stops) sont actuellement en `common.*`. Pour le General History tour (1h30, 2.5km, 3 stops), il faut soit :

1. Ajouter `heroDuration`, `heroDistance`, `heroStops` dans `TourConfig` (recommandé)
2. Ou utiliser des clés i18n par tour

**Option recommandée** — dans `TourConfig` :
```typescript
heroBadges: {
  duration: "1.5 hours",     // ou clé i18n
  distance: "2.5 km walking",
  stops: "3 historic stops",
}
```

### 6d. Section cross-links (voir Tâche 2f)

Remplacer la section single cross-link par un grid de cross-links.

### 6e. JSON-LD adapté

Le JSON-LD actuel mentionne "WWII Walking Tour". Pour le General History tour, adapter :

```typescript
"name": t(`tours.${tp}.title`) + " - Paris Walking Tour",
"touristType": ["History enthusiast", "Cultural traveler", "First-time visitor"],
"itinerary": {
  "@type": "ItemList",
  "numberOfItems": tourConfig.stopCount,
  "itemListElement": tourConfig.stops.map((_, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "name": t(`tours.${tp}.stops.stop${i + 1}.title`)
  }))
},
```

---

## Tâche 7 : Intégrer dans la navigation et la homepage

### 7a. Homepage — section Tours Available

**Fichier** : `src/components/ToursAvailable.astro` ou directement dans `index.astro`

Ajouter une troisième carte de tour. Actuellement 2 cartes (Left Bank, Right Bank) → 3 cartes. Adapter le grid `md:grid-cols-2` en `md:grid-cols-3` ou garder 2 colonnes avec la 3ème centrée en dessous.

### 7b. Navbar

Si le menu de navigation liste les tours, ajouter "General History Tour" dans le dropdown/menu.

### 7c. Booking system

**Fichier** : `src/components/BookTour/BookingWizard.tsx`

Le composant `BookingWizard` a un prop `defaultTour` qui est `'left-bank' | 'right-bank'`. Ajouter `'general-history'` au type et dans les options de sélection.

Vérifier aussi :
- Le step de sélection de tour (dropdown ou boutons) inclut le nouveau tour
- Le prix est configuré (Stripe ou équivalent)
- Les sessions/créneaux sont gérés côté API

### 7d. Traductions booking card

Ajouter dans `en.ts` et `fr.ts` :
```typescript
booking: {
  generalHistoryDescription: "Walk through 2,000 years of Paris history: Roman Lutetia, the Viking siege, and the French Revolution. 1.5 hours, 3 stops with a passionate local guide.",
}
```

---

## Tâche 8 : SEO & GEO

### 8a. Sitemap

Le sitemap Astro est auto-généré : la nouvelle page `/tours/general-history` apparaîtra automatiquement après le build. ✓

### 8b. llms.txt

Ajouter dans `public/llms.txt` :

```markdown
## Tours

### WWII Walking Tours (Left Bank & Right Bank)
(contenu existant)

### General History of Paris Tour — NEW
- 2,000 years of Paris history in 1.5 hours
- 3 stops: Roman Lutetia (Thermes de Cluny), Viking Siege of 885 (Île de la Cité), French Revolution (Tuileries)
- Available in English and French
- Small groups, max 10 people
- Book at https://www.parishistorytours.com/tours/general-history
```

### 8c. Schema.org homepage

Mettre à jour le `hasOfferCatalog` dans le JSON-LD de `index.astro` pour inclure le 3ème tour avec son URL et son prix.

---

## Tâche 9 : Photos

### 9a. Structure des dossiers

```bash
mkdir -p public/photos/general_history
```

### 9b. Photos fournies par Clément (gallery)

Clément fournit les 8 photos de gallery en JPG. **Claude Code doit les traiter** :

```bash
# Pipeline de traitement pour chaque JPG uploadé :
# 1. Resize à max 1200px de large (garder le ratio)
# 2. Convertir en WebP quality 75-80
# 3. Strip EXIF metadata
# 4. Nommer gallery_1.webp ... gallery_8.webp
# 5. Placer dans public/photos/general_history/

# Avec sharp (npm) :
npm install sharp
node -e "
const sharp = require('sharp');
const fs = require('fs');
const files = fs.readdirSync('input_gallery').filter(f => /\.jpe?g$/i.test(f)).sort();
files.forEach((f, i) => {
  sharp('input_gallery/' + f)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile('public/photos/general_history/gallery_' + (i+1) + '.webp');
});
"

# OU avec cwebp (CLI) :
for f in input_gallery/*.jpg; do
  cwebp -q 78 -resize 1200 0 "$f" -o "public/photos/general_history/$(basename ${f%.jpg}.webp)"
done
```

### 9c. Images à sourcer par Claude Code (hero, themes, stops, OG)

Pour les images non fournies par Clément, **Claude Code doit chercher et télécharger des images libres de droits** depuis Wikimedia Commons (préféré, domaine public) ou Unsplash/Pexels.

| Usage | Nom de fichier | Quoi chercher | Source suggérée |
|-------|---------------|---------------|-----------------|
| Hero | `hero_general_history.webp` | Vue panoramique Île de la Cité ou panorama de Paris historique | Wikimedia Commons / Unsplash |
| Theme 1 | `theme_roman_paris.webp` | Thermes de Cluny (photo des ruines) ou reconstitution de Lutèce | Wikimedia Commons |
| Theme 2 | `theme_medieval_paris.webp` | Île de la Cité vue aérienne, ou gravure du siège viking | Wikimedia Commons |
| Theme 3 | `theme_revolution_paris.webp` | Jardin des Tuileries, ou peinture/gravure de la Révolution | Wikimedia Commons |
| Stop 1 | `stop1_thermes_cluny.webp` | Thermes de Cluny (façade extérieure, ruines romaines) | Wikimedia Commons |
| Stop 2 | `stop2_ile_cite.webp` | Île de la Cité (vue du pont, cathédrale, quais) | Wikimedia / Unsplash |
| Stop 3 | `stop3_tuileries.webp` | Jardin des Tuileries (allée centrale, bassin) | Wikimedia / Unsplash |
| OG Image | `og_general_history.webp` | Composite ou belle vue de Paris (1200×630) | Unsplash |

**Même pipeline de traitement** que les gallery : resize, WebP q78, strip EXIF.

Le hero va dans `src/images/` (pour le composant Astro `Picture`). Tout le reste dans `public/photos/general_history/`.

**Licences** : privilégier CC0 / Public Domain / CC-BY. Si CC-BY, noter l'attribution dans un fichier `public/photos/general_history/CREDITS.md`.

> **Important** : Ces images sont temporaires. Clément les remplacera progressivement par ses propres photos au fur et à mesure des tours.

---

## Tâche 10 : Mettre à jour les tests / FAQ

### FAQ

Le composant `FAQ.astro` est partagé. Vérifier si les questions actuelles sont spécifiques au WWII ou génériques. Si spécifiques, ajouter des FAQ conditionnelles par tour ou rendre les réponses dynamiques.

Questions FAQ spécifiques au General History tour à ajouter :
- "What period of history does this tour cover?" → "From the Gallic settlement (~3rd century BC) through the Roman era, the Viking siege of 885, and up to the French Revolution in 1791."
- "Is this tour suitable for children?" → "Yes! The stories are engaging and interactive — your guide uses visual aids and asks questions to keep everyone involved."
- "How is this different from your WWII tours?" → "While our WWII tours focus on 1940-1944, this tour spans 2,000 years of Parisian history through three dramatic stories that shaped the city."

---

## Ordre d'exécution recommandé

```
1. Tâche 2  → tours.ts : ajouter config + refactorer crossLinks (singulier → pluriel)
2. Tâche 3  → en.ts : toutes les traductions EN
3. Tâche 4  → fr.ts : toutes les traductions FR
4. Tâche 6  → [tour].astro : adaptations template (thèmes dynamiques, stops dynamiques, cross-links)
5. Tâche 1  → [tour].astro : getStaticPaths + hero image
6. Tâche 5  → TourMap.tsx : données carte Mapbox
7. Tâche 7  → Navigation, homepage, booking integration
8. Tâche 9  → Créer dossier photos + placeholders
9. Tâche 8  → SEO : llms.txt, schema.org, meta
10. Tâche 10 → FAQ adaptations
```

Chaque tâche = un commit atomique. Build test après chaque commit.

---

## Prompt Claude Code

Voici le prompt à donner à Claude Code pour implémenter cette spec :

```
Lis le fichier PHASE5_GENERAL_HISTORY_TOUR.md à la racine du projet. Il contient la spec complète pour ajouter une troisième visite guidée "General History of Paris" au site.

Le tour couvre 2 000 ans d'histoire de Paris en 3 arrêts :
- Stop 1 : Thermes de Cluny (période gallo-romaine, bataille de 52 av. J.-C.)
- Stop 2 : Île de la Cité (siège viking de 885-886)
- Stop 3 : Jardin des Tuileries (Révolution française, fuite de Varennes 1791)

La page doit avoir exactement la même structure que les pages left-bank et right-bank existantes, avec les adaptations suivantes :
- 3 stops au lieu de 4 (carousel et indicators dynamiques)
- 3 thèmes différents : "roman", "medieval", "revolution" (au lieu de "fall", "resistance", "liberation")
- Section cross-links vers 2 tours (au lieu de 1) — refactorer crossLink → crossLinks (array) pour TOUS les tours
- Durée 1h30 au lieu de 2h
- Hero badges dynamiques par tour

Suis l'ordre d'exécution de la spec. Fais un commit atomique par tâche. Pour les coordonnées Mapbox, utilise les coordonnées indiquées dans la spec (Thermes de Cluny, Île de la Cité, Tuileries).

## Photos

Deux types de photos à gérer :

1. **Gallery (fournies par Clément en JPG)** : Les fichiers JPG sont dans le repo. Traite-les avec sharp ou cwebp :
   - Resize max 1200px de large
   - Convertir en WebP quality 78
   - Strip les métadonnées EXIF
   - Nommer gallery_1.webp ... gallery_8.webp
   - Placer dans public/photos/general_history/

2. **Hero, themes, stops, OG (à sourcer)** : Cherche et télécharge des images libres de droits depuis Wikimedia Commons (préféré) ou Unsplash/Pexels. Voir la table dans la Tâche 9c de la spec pour les sujets à chercher. Même traitement (resize, WebP, strip EXIF). Le hero va dans src/images/, le reste dans public/photos/general_history/. Si licence CC-BY, crée un fichier CREDITS.md avec les attributions.

Important :
- Le contenu historique dans les traductions est un DRAFT — il sera relu et validé avant publication
- Ne PAS toucher au contenu des tours left-bank et right-bank (sauf pour refactorer crossLink → crossLinks)
- Vérifie que le build passe après chaque modification majeure
- Ajoute le tour dans le booking system (BookingWizard), la navigation, et la homepage
```

---

## Rappels importants

- **Le contenu historique est un DRAFT** — Clément doit relire et valider avant publication
- **Les photos hero/themes/stops sont sourcées par Claude Code** depuis Wikimedia/Unsplash — temporaires, Clément les remplacera par ses propres photos
- **Les photos gallery sont fournies par Clément en JPG** — Claude Code les convertit en WebP (resize 1200px, q78, strip EXIF)
- **Les coordonnées Mapbox sont approximatives** — à ajuster avec les positions exactes des arrêts
- **Le refactoring crossLink → crossLinks** impacte les 3 tours et le template — bien tester
- **Le prix et les créneaux** du nouveau tour doivent être configurés dans Stripe et dans l'admin
- **La FAQ** peut nécessiter des questions spécifiques au General History tour
- **Le llms.txt** doit être mis à jour pour le GEO (visibilité LLM)
