# Phase 1 — Architecture & Code Cleanup

> **Objectif** : Dédupliquer, modulariser et nettoyer la dette technique du codebase AVANT d'attaquer la refonte du parcours de réservation (Phase 2) et l'optimisation performance (Phase 3).
>
> **Règle fondamentale** : Chaque tâche doit être un commit atomique. Le site doit builder (`astro build`) et fonctionner à l'identique après chaque tâche. Aucune régression visuelle, aucun lien cassé, aucun changement de comportement utilisateur.

---

## Vue d'ensemble du codebase actuel

```
src/
├── pages/
│   ├── index.astro              # 615 lignes — Homepage EN (hero, carousel, nav, booking, scripts inline)
│   ├── key-figures.astro        # Page "À propos"
│   ├── success.astro            # Page post-paiement
│   ├── tours/
│   │   ├── left-bank.astro      # 983 lignes — monolithe avec ~200 lignes de script inline
│   │   └── right-bank.astro     # 859 lignes — même structure que left-bank
│   ├── blog/
│   │   ├── index.astro          # Liste des articles EN
│   │   └── [...slug].astro      # Article individuel EN
│   ├── fr/
│   │   ├── index.astro          # 298 lignes — DUPLICATION de index.astro avec différences de nav
│   │   ├── [...slug].astro      # Catch-all qui fait Astro.rewrite() vers les pages EN
│   │   └── blog/
│   │       ├── index.astro      # DUPLICATION de blog/index.astro (hardcodé FR)
│   │       └── [...slug].astro  # Article individuel FR
│   └── api/
│       ├── booking.ts           # API de booking (Supabase)
│       ├── create-checkout-session.ts  # Stripe Checkout
│       ├── send-booking-email.ts       # Email via Resend
│       ├── stripe-price.ts      # Fetch prix Stripe
│       └── stripe-webhook.ts    # Webhook Stripe
├── components/
│   ├── BookTour.astro           # Wrapper du booking wizard
│   ├── BookTour/
│   │   ├── BookingWizard.tsx    # Wizard React 6 étapes
│   │   ├── BookingContext.tsx    # Context React
│   │   ├── types.ts
│   │   ├── components/
│   │   │   ├── ProgressIndicator.tsx
│   │   │   └── StepWrapper.tsx
│   │   └── steps/
│   │       ├── StepTourSelection.tsx
│   │       ├── StepParticipants.tsx
│   │       ├── StepTourType.tsx
│   │       ├── StepCalendarRegular.tsx  # ⚠️ importe supabase côté client
│   │       ├── StepDateTimePrivate.tsx
│   │       ├── StepContact.tsx
│   │       └── StepSummary.tsx          # ⚠️ importe supabase côté client
│   ├── ui/
│   │   ├── aurora-background.tsx        # React — effet décoratif (client:only)
│   │   ├── background-gradient-animation.tsx  # 186 lignes — INUTILISÉ ?
│   │   └── LocationCarousel.tsx         # React carousel (client:only)
│   ├── Reviews.astro
│   ├── Welcome.astro
│   ├── ToursAvailable.astro
│   ├── Footer.astro
│   ├── FAQ.astro
│   ├── Breadcrumbs.astro
│   ├── JsonLd.astro
│   ├── LanguageSwitcher.astro
│   ├── WhatsAppButton.astro
│   ├── TourMap.tsx              # Mapbox GL (client:visible) — 328 lignes
│   ├── WorldMap.tsx             # react-simple-maps — 299 lignes
│   ├── CountriesChart.tsx       # Chart pour key-figures
│   ├── KeyFiguresStats.tsx      # Stats pour key-figures
│   └── Timeline.tsx             # Timeline component
├── i18n/
│   ├── utils.ts                 # useTranslations()
│   └── translations/
│       ├── en.ts                # 21K — toutes les traductions EN
│       └── fr.ts                # 24K — toutes les traductions FR
├── layouts/
│   └── BaseLayout.astro         # Head, meta, GTM, fonts, footer
├── lib/
│   ├── booking.ts               # finalizeBooking(), cancelBooking()
│   ├── supabase.ts              # Client Supabase
│   └── utils.ts                 # cn() helper
├── styles/
│   └── global.css               # Tailwind import + CSS aurora vars
├── content/
│   └── blog/                    # 4 articles markdown (2 EN, 2 FR)
└── middleware.ts                 # Détection de langue (fr/en)
```

### Stack technique
- **Framework** : Astro 5.x (SSR via Vercel adapter)
- **UI** : React 19 (islands) + Tailwind CSS 4
- **Backend** : Supabase (sessions/bookings), Stripe (paiements), Resend (emails)
- **Maps** : Mapbox GL (tour maps), react-simple-maps (world map)
- **Hosting** : Vercel
- **Analytics** : GTM + GA4

---

## Problèmes identifiés

### 1. Duplication FR/EN des pages
- `src/pages/fr/index.astro` est une copie quasi-intégrale de `src/pages/index.astro` avec des différences mineures :
  - La nav desktop FR est TOUJOURS visible (pas de scroll-based show/hide), celle EN est scroll-based
  - Le contenu du carousel est hardcodé en FR dans fr/index.astro au lieu d'utiliser les traductions
  - Le menu mobile est dupliqué avec le même JS
- `src/pages/fr/blog/index.astro` est une copie de `src/pages/blog/index.astro` avec le filtre de langue hardcodé
- Le pattern `fr/[...slug].astro` utilise déjà `Astro.rewrite()` pour tours et key-figures — la homepage FR devrait faire pareil

### 2. Scripts inline massifs
- `index.astro` contient ~150 lignes de `<script>` pour : scroll banner, mobile menu, booking scroll, participant selection
- Les pages de tour (`left-bank.astro`, `right-bank.astro`) contiennent chacune ~200 lignes de `<script>` inline pour : scroll banner, timeline, gallery
- Ce JS est non-réutilisable, non-testable, et dupliqué entre les pages

### 3. Composants React inutilement lourds
- `AuroraBackground` utilise `client:only="react"` — charge React juste pour un effet CSS qui pourrait être pur CSS
- `background-gradient-animation.tsx` (186 lignes) semble inutilisé — à confirmer et supprimer
- `LocationCarousel` utilise `client:only="react"` — pourrait être un carousel CSS/Astro pur
- `WorldMap.tsx` et `CountriesChart.tsx` chargent `react-simple-maps` pour la page key-figures

### 4. Supabase côté client
- `StepCalendarRegular.tsx` importe directement `supabase` et fait des requêtes client-side
- `StepSummary.tsx` insère des bookings privés directement via Supabase client-side
- Les clés Supabase (même anon) sont dans le bundle client
- Ces appels devraient passer par des API routes serveur

### 5. Monolithes de pages de tour
- `left-bank.astro` (983 lignes) et `right-bank.astro` (859 lignes) partagent 80% de structure
- Seuls changent : les stops (contenu, images, coordonnées), les traductions, et quelques détails
- Devrait être un template unique `[tour].astro` alimenté par des données

### 6. Favicons surdimensionnés
- `favicon-32x32.png` = 109 Ko (devrait être <5 Ko)
- `favicon-16x16.png` = 24 Ko (devrait être <2 Ko)
- `apple-touch-icon.png` = 22 Ko (OK mais vérifier)

---

## Tâches — Ordre d'exécution

### Tâche 1 : Supprimer le code mort

**Fichiers à auditer :**
```bash
# Vérifier si background-gradient-animation.tsx est importé quelque part
grep -r "background-gradient-animation" src/ --include="*.astro" --include="*.tsx" --include="*.ts"

# Vérifier s'il y a d'autres imports inutilisés
grep -r "BackgroundGradientAnimation" src/
```

**Actions :**
- Si `background-gradient-animation.tsx` n'est importé nulle part → supprimer
- Vérifier s'il y a des imports inutilisés dans chaque composant
- Supprimer les `console.log` de debug restants dans les API routes (garder les `console.error`)

**Commit** : `chore: remove dead code and unused components`

---

### Tâche 2 : Extraire les scripts inline en modules

**Objectif** : Transformer les `<script>` inline des pages en fichiers `.ts` réutilisables dans `src/scripts/`.

**Structure cible :**
```
src/scripts/
├── scroll-banner.ts       # Logique d'affichage de la nav au scroll (desktop + mobile)
├── mobile-menu.ts         # Toggle hamburger menu
├── smooth-scroll.ts       # Scroll vers sections (#book-tour, etc.)
└── booking-ui.ts          # Sélection participants (si encore utilisé après Phase 2)
```

**Étapes :**

1. **Créer `src/scripts/scroll-banner.ts`** — Extraire la logique de `handleScroll()` qui affiche/masque les bannières `#book-banner-desktop` et `#book-banner-mobile` au scroll. Cette logique est dupliquée dans `index.astro` (EN), `fr/index.astro`, et les pages de tour.

```typescript
// src/scripts/scroll-banner.ts
export function initScrollBanner(options: {
  bannerIds: string[];       // ex: ['book-banner-desktop', 'book-banner-mobile']
  showAfterPx: number;       // ex: 200
  hideBeforeSelector?: string; // ex: '#book-tour'
}) {
  // ... logique extraite
}
```

2. **Créer `src/scripts/mobile-menu.ts`** — Extraire la logique toggle du menu hamburger. Identique dans index.astro EN et FR.

3. **Créer `src/scripts/smooth-scroll.ts`** — Extraire le `scrollToBooking()` et les event listeners pour le smooth scroll.

4. **Remplacer dans les pages** — Importer les modules dans les `<script>` tags :
```astro
<script>
  import { initScrollBanner } from '../scripts/scroll-banner';
  import { initMobileMenu } from '../scripts/mobile-menu';
  
  initScrollBanner({ bannerIds: ['book-banner-desktop', 'book-banner-mobile'], showAfterPx: 200 });
  initMobileMenu();
</script>
```

**Critères de validation :**
- Le comportement scroll/menu est identique avant/après
- Le JS n'est plus dupliqué entre les pages
- `astro build` passe sans erreur

**Commit** : `refactor: extract inline scripts to reusable modules`

---

### Tâche 3 : Extraire la navigation en composant

**Problème** : La nav desktop et mobile est écrite inline dans chaque page (index.astro, fr/index.astro, tour pages) avec des variations légères.

**Structure cible :**
```
src/components/
├── Navbar.astro            # Nav desktop (scroll-based show/hide)
├── MobileMenu.astro        # Menu hamburger mobile
```

**Étapes :**

1. **Créer `Navbar.astro`** avec les props :
```astro
---
interface Props {
  variant?: 'scroll' | 'fixed';  // 'scroll' = apparaît au scroll, 'fixed' = toujours visible
  links?: Array<{ label: string; href: string }>;
  bookLabel?: string;
  bookTarget?: string;  // '#book-tour' par défaut
}
---
```

2. **Créer `MobileMenu.astro`** avec les mêmes props de navigation.

3. **Remplacer** le code inline dans `index.astro`, `fr/index.astro`, et les pages de tour.

**Note** : La version FR a actuellement une nav différente (toujours visible, style blanc au lieu de gris). Uniformiser sur le pattern scroll-based comme la version EN, sauf si Clément préfère l'autre style — dans ce cas, le prop `variant` gère les deux.

**Commit** : `refactor: extract Navbar and MobileMenu into reusable components`

---

### Tâche 4 : Dédupliquer la homepage FR

**Problème** : `src/pages/fr/index.astro` (298 lignes) est une copie de `src/pages/index.astro` (615 lignes) avec des différences mineures.

**Solution** : Utiliser le pattern `Astro.rewrite()` déjà en place dans `fr/[...slug].astro`.

**Étapes :**

1. **Ajouter le cas homepage dans `fr/[...slug].astro`** :
```astro
if (!slug) {
  return Astro.rewrite('/');  // au lieu de Astro.redirect('/')
}
```

2. **Supprimer `src/pages/fr/index.astro`** entièrement.

3. **S'assurer que `index.astro` gère correctement les deux langues** — il le fait déjà via `Astro.locals.lang` et `useTranslations(lang)`, mais vérifier :
   - Le carousel utilise `t()` pour les textes (certaines descriptions sont hardcodées en anglais dans index.astro → les migrer dans les fichiers de traduction)
   - La nav utilise `langPrefix` correctement
   - Le `JsonLd` s'adapte à la langue

4. **Migrer les textes hardcodés du carousel** dans les fichiers i18n. Actuellement, les `description` des cards du carousel sont en partie hardcodées en anglais :
```typescript
// AVANT (dans index.astro) :
description: t('home.gallery.pantheon.description') + ' The Palais du Luxembourg served as the Luftwaffe headquarters during the 4-year Nazi occupation of Paris.',

// APRÈS (dans en.ts / fr.ts) :
// Ajouter les clés : home.gallery.pantheon.fullDescription, etc.
```

**Critères de validation :**
- `parishistorytours.com/fr` affiche exactement le même contenu qu'avant
- `parishistorytours.com/` affiche exactement le même contenu qu'avant
- Les hreflang tags fonctionnent toujours (`<link rel="alternate" hreflang="fr">`)
- Le language switcher fonctionne dans les deux sens
- `fr/index.astro` n'existe plus

**Commit** : `refactor: deduplicate FR homepage via Astro.rewrite()`

---

### Tâche 5 : Dédupliquer le blog FR

**Problème** : `src/pages/fr/blog/index.astro` est une copie de `src/pages/blog/index.astro` avec la langue hardcodée.

**Solution** : Même pattern — `blog/index.astro` utilise déjà `Astro.locals.lang`, donc il suffit de router via rewrite.

**Étapes :**

1. **Ajouter les routes blog dans `fr/[...slug].astro`** :
```astro
} else if (slug === 'blog') {
  return Astro.rewrite('/blog');
} else if (slug?.startsWith('blog/')) {
  return Astro.rewrite(`/${slug}`);
}
```

2. **Supprimer `src/pages/fr/blog/`** entièrement (index.astro et [...slug].astro).

3. **Vérifier que `blog/index.astro` filtre bien par `Astro.locals.lang`** — il le fait déjà (`data.lang === lang`).

4. **Vérifier que `blog/[...slug].astro` respecte la langue** — vérifier que les hreflang sont corrects.

**Commit** : `refactor: deduplicate FR blog via Astro.rewrite()`

---

### Tâche 6 : Unifier les pages de tour en un template

**Problème** : `left-bank.astro` (983 lignes) et `right-bank.astro` (859 lignes) partagent ~80% de structure.

**Solution** : Un template unique `src/pages/tours/[tour].astro` alimenté par des données.

**Étapes :**

1. **Créer un fichier de données `src/data/tours.ts`** qui contient la configuration de chaque tour :
```typescript
export interface TourStop {
  id: string;
  titleKey: string;          // clé i18n
  descriptionKey: string;    // clé i18n
  image: ImageMetadata;      // import Astro
  coordinates: [number, number];
}

export interface TourConfig {
  slug: 'left-bank' | 'right-bank';
  heroImage: ImageMetadata;
  heroAlt: string;
  titleKey: string;
  descriptionKey: string;
  stops: TourStop[];
  meetingPoint: { lat: number; lng: number; descriptionKey: string };
}

export const tours: Record<string, TourConfig> = {
  'left-bank': {
    slug: 'left-bank',
    heroImage: /* import */,
    stops: [
      { id: 'blvd-st-michel', titleKey: 'tours.leftBank.stop1.title', image: /* ... */, coordinates: [48.849, 2.344] },
      // ...
    ]
  },
  'right-bank': { /* ... */ }
};
```

2. **Créer `src/pages/tours/[tour].astro`** :
```astro
---
import { tours } from '../../data/tours';

export function getStaticPaths() {
  return Object.keys(tours).map(slug => ({ params: { tour: slug } }));
}

const { tour: tourSlug } = Astro.params;
const tour = tours[tourSlug];
if (!tour) return Astro.redirect('/404');
---
```

3. **Migrer le contenu** stop par stop. Les deux pages ont la même structure :
   - Hero section (image plein écran + titre)
   - Section info (durée, distance, stops)
   - Section carte (TourMap)
   - Sections par stop (image + texte + anecdotes)
   - Section booking
   - FAQ

4. **Supprimer `left-bank.astro` et `right-bank.astro`** une fois le template validé.

5. **Mettre à jour `fr/[...slug].astro`** pour router vers `tours/[tour]` au lieu de `tours/left-bank` et `tours/right-bank`.

**⚠️ ATTENTION SEO** : Les URLs doivent rester IDENTIQUES (`/tours/left-bank`, `/tours/right-bank`, `/fr/tours/left-bank`, `/fr/tours/right-bank`). Vérifier avec un crawl que toutes les anciennes URLs renvoient le même contenu.

**Commit** : `refactor: unify tour pages into dynamic [tour].astro template`

---

### Tâche 7 : Migrer les appels Supabase client → API routes

**Problème** : `StepCalendarRegular.tsx` et `StepSummary.tsx` importent directement le client Supabase et font des requêtes depuis le navigateur.

**Solution** : Créer des API routes serveur et appeler celles-ci depuis le frontend.

**Nouvelles API routes :**

```
src/pages/api/
├── sessions.ts          # GET — liste les sessions disponibles pour un tour
├── sessions/[date].ts   # GET — slots d'un jour donné
└── bookings/private.ts  # POST — créer un booking privé
```

**Étapes :**

1. **Créer `src/pages/api/sessions.ts`** :
```typescript
// GET /api/sessions?tour=left-bank&participants=2
export const GET: APIRoute = async ({ url }) => {
  const tour = url.searchParams.get('tour');
  const participants = parseInt(url.searchParams.get('participants') || '1');
  
  const { data, error } = await supabase
    .from('sessions')
    .select('id, start_time, available_spots, tour_type')
    .eq('tour_type', tour)
    .gte('start_time', new Date().toISOString())
    .gte('available_spots', participants);
    
  // ... retourner les données groupées par date
};
```

2. **Créer `src/pages/api/bookings/private.ts`** — déplacer la logique d'insertion de `StepSummary.tsx`.

3. **Modifier `StepCalendarRegular.tsx`** — remplacer les imports Supabase par des `fetch('/api/sessions?...')`.

4. **Modifier `StepSummary.tsx`** — remplacer l'insertion Supabase directe par `fetch('/api/bookings/private', { method: 'POST', ... })`.

5. **Vérifier que `src/lib/supabase.ts` n'est plus importé dans AUCUN fichier sous `src/components/`** — il ne doit être utilisé que dans `src/pages/api/` et `src/lib/`.

**Commit** : `refactor: move Supabase calls from client to API routes`

---

### Tâche 8 : Remplacer AuroraBackground par du CSS pur

**Problème** : `AuroraBackground` est un composant React chargé via `client:only="react"` uniquement pour un effet visuel CSS. Il force le chargement de React sur la homepage juste pour appliquer des classes Tailwind.

**Solution** : Remplacer par un `<div>` avec les mêmes classes CSS dans un composant Astro.

**Étapes :**

1. **Créer `src/components/AuroraBackground.astro`** :
```astro
---
interface Props {
  class?: string;
}
---
<div class:list={["relative flex flex-col items-center justify-center bg-zinc-50 text-slate-950 transition-[background] min-h-full", Astro.props.class]}>
  <div class="absolute inset-0 overflow-hidden">
    <div class="[--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)] [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)] [background-image:var(--white-gradient),var(--aurora)] [background-size:300%,_200%] blur-[10px] invert after:content-[''] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] after:[background-size:200%,_100%] after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference pointer-events-none absolute -inset-[10px] opacity-50 will-change-transform [mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]">
    </div>
  </div>
  <div class="relative z-10 w-full">
    <slot />
  </div>
</div>
```

2. **Remplacer dans `index.astro`** :
```astro
<!-- AVANT -->
<AuroraBackground client:only="react" className="min-h-full" />

<!-- APRÈS -->
<AuroraBackground class="min-h-full" />
```

3. **Supprimer `src/components/ui/aurora-background.tsx`**.

4. **Vérifier que l'animation CSS `aurora` dans `global.css` fonctionne toujours** — elle est déjà définie dans `@theme` et les variables CSS sont dans `:root`.

**Impact** : Supprime un chargement React côté client pour la homepage (économie significative de JS).

**Commit** : `perf: replace React AuroraBackground with Astro component (zero JS)`

---

### Tâche 9 : Optimiser les favicons

**Problème** : `favicon-32x32.png` = 109 Ko, `favicon-16x16.png` = 24 Ko. Anormalement lourds.

**Actions :**
```bash
# Vérifier les dimensions réelles
identify public/favicon-32x32.png
identify public/favicon-16x16.png

# Recompresser correctement
convert public/favicon-32x32.png -resize 32x32 -strip public/favicon-32x32.png
convert public/favicon-16x16.png -resize 16x16 -strip public/favicon-16x16.png

# OU si les images originales sont en fait des images haute résolution mal nommées
# → Créer de vrais favicons à partir du logo/icône du site
```

**Commit** : `perf: optimize oversized favicons`

---

### Tâche 10 : Audit et nettoyage des dépendances

**Vérifications à faire :**

```bash
# Dépendances potentiellement inutilisées après les refactors précédents
grep -r "framer-motion" src/ --include="*.tsx" --include="*.ts" --include="*.astro"
grep -r "react-simple-maps" src/ --include="*.tsx" --include="*.ts"
grep -r "clsx" src/ --include="*.tsx" --include="*.ts"
grep -r "date-fns" src/ --include="*.tsx" --include="*.ts"
grep -r "tailwind-merge" src/ --include="*.tsx" --include="*.ts"
```

**Actions conditionnelles :**
- Si `framer-motion` n'est plus utilisé après la suppression de `aurora-background.tsx` → `pnpm remove framer-motion`
- Si `background-gradient-animation.tsx` est supprimé et qu'il était le seul usage de certaines deps → nettoyer
- Vérifier que `clsx` et `tailwind-merge` sont réellement utilisés (ils alimentent `cn()` dans `lib/utils.ts`)
- `date-fns` est importé dans `package.json` mais est-il vraiment utilisé ? Le calendrier utilise `react-day-picker` qui a ses propres utils de date

**Commit** : `chore: remove unused dependencies`

---

## Validation finale Phase 1

Après toutes les tâches, vérifier :

```bash
# 1. Build sans erreur
pnpm build

# 2. Toutes les URLs existantes fonctionnent
# Pages EN
curl -s -o /dev/null -w "%{http_code}" https://localhost:4321/
curl -s -o /dev/null -w "%{http_code}" https://localhost:4321/tours/left-bank
curl -s -o /dev/null -w "%{http_code}" https://localhost:4321/tours/right-bank
curl -s -o /dev/null -w "%{http_code}" https://localhost:4321/key-figures
curl -s -o /dev/null -w "%{http_code}" https://localhost:4321/blog

# Pages FR
curl -s -o /dev/null -w "%{http_code}" https://localhost:4321/fr
curl -s -o /dev/null -w "%{http_code}" https://localhost:4321/fr/tours/left-bank
curl -s -o /dev/null -w "%{http_code}" https://localhost:4321/fr/tours/right-bank
curl -s -o /dev/null -w "%{http_code}" https://localhost:4321/fr/key-figures
curl -s -o /dev/null -w "%{http_code}" https://localhost:4321/fr/blog

# 3. Vérifier que les API routes fonctionnent
curl -X POST https://localhost:4321/api/sessions?tour=left-bank&participants=1

# 4. Vérifier les hreflang
curl -s https://localhost:4321/ | grep hreflang
curl -s https://localhost:4321/fr | grep hreflang

# 5. Vérifier le sitemap
curl -s https://localhost:4321/sitemap-0.xml
```

**Métriques de succès :**
- Nombre de fichiers dans `src/pages/fr/` réduit (plus de index.astro ni blog/)
- `left-bank.astro` et `right-bank.astro` remplacés par `[tour].astro`
- Aucun import de `supabase` dans `src/components/`
- `client:only="react"` supprimé de la homepage (plus d'AuroraBackground React)
- Build size : mesurer avant/après avec `du -sh dist/`

---

## Ordre d'exécution recommandé pour Claude Code

```
Tâche 1  → code mort (rapide, sans risque)
Tâche 9  → favicons (rapide, sans risque)
Tâche 2  → scripts inline → modules
Tâche 3  → navigation → composants
Tâche 8  → aurora → CSS pur
Tâche 4  → homepage FR dédup
Tâche 5  → blog FR dédup
Tâche 7  → Supabase → API routes
Tâche 6  → tour pages unifiées (la plus complexe, faire en dernier)
Tâche 10 → nettoyage dépendances (faire après tous les autres refactors)
```

Chaque tâche = un commit atomique. Tester le build après chaque commit.
