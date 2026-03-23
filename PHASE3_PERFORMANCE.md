# Phase 3 — Performance & Optimisation Images

> **Objectif** : PageSpeed mobile >90, LCP <2.5s, CLS <0.1. Réduire le JS client, optimiser les images, éliminer les render-blocking resources.
>
> **Règle fondamentale** : Ne JAMAIS remplacer ou supprimer les photos de Clément. Uniquement optimiser (compression, redimensionnement, formats modernes). Le site doit être visuellement identique après chaque tâche.

---

## État des lieux post Phase 1-2

### Images — problème principal
- `src/images/guide-photo.webp` = **4.1 Mo, 5472×3648px** — la photo de Clément en hero. Affichée max ~1920px large. C'est le plus gros fichier du site.
- `src/images/pantheon_de_Paris.webp` = 310 Ko, 2000×1333px — hero tour Left Bank (OK)
- `src/images/place_vendome_paris.webp` = 168 Ko, 1950×1300px — hero tour Right Bank (OK)
- Photos dans `public/photos/` : beaucoup sont à 4000-5000px de large, servies brutes sans pipeline Astro :
  - `Paris_WW2_Luxembourg_palace.webp` = 851 Ko, 4884×3256px
  - `Paris_WW2_bullet_holes_2.webp` = 700 Ko, 4952×3301px
  - `place_concorde_paris.webp` = 625 Ko, 4000×2253px
  - Et ~15 autres photos >200 Ko à des résolutions inutilement élevées
- 1 fichier JPEG orphelin non référencé : `public/photos/left_bank/Paris_WW2_tour_guided_group_photo.jpeg` (98 Ko) → à supprimer
- Les images dans `public/photos/` sont référencées via des URLs brutes (`/photos/...`) dans le carousel et les pages — elles ne bénéficient pas du pipeline `<Picture>` d'Astro (pas de srcset, pas de conversion AVIF, pas de redimensionnement automatique)

### JS client — trop lourd
- `AuroraBackground` (`src/components/ui/aurora-background.tsx`) : encore chargé comme composant React via `client:only="react"` sur la homepage. **La tâche 8 de Phase 1 (remplacement par CSS pur) n'a pas été appliquée.** C'est la priorité n°1 — ça charge React entier juste pour un div avec des classes CSS.
- `LocationCarousel` (`src/components/ui/LocationCarousel.tsx`, 215 lignes) : React `client:only="react"` sur la homepage. Un carousel CSS/JS vanilla serait plus léger.
- `TourMap` (`src/components/TourMap.tsx`, 328 lignes) : utilise `mapbox-gl` (lib très lourde ~200Ko gzip) via `client:visible`. Chargé sur chaque page de tour.
- Page `key-figures.astro` charge 3 composants React `client:load` :
  - `KeyFiguresStats.tsx` — framer-motion + supabase client
  - `CountriesChart.tsx` — framer-motion + supabase client
  - `WorldMap.tsx` — react-simple-maps + supabase client + world-110m.json (106 Ko)
- `framer-motion` est toujours dans les dépendances, utilisé par ces 3 composants

### Fonts — render-blocking
- Montserrat est chargé via Google Fonts CDN : `<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500&display=swap" />`
- Utilisé UNIQUEMENT dans le hero de la homepage : `style="font-family: 'Montserrat', Inter, system-ui, sans-serif;"`
- C'est un render-blocking resource pour 2 poids de police utilisés sur une seule section

### Supabase côté client (résidu)
- Les composants `key-figures` (`WorldMap.tsx`, `CountriesChart.tsx`, `KeyFiguresStats.tsx`) importent encore `supabase` côté client
- Les anciens fichiers de booking (`StepCalendarRegular.tsx`, `StepSummary.tsx`) existent encore avec des imports Supabase — vérifier s'ils sont encore utilisés ou si les nouveaux Step2/Step3 les ont remplacés

---

## Tâches — Ordre d'exécution

### Tâche 1 : Remplacer AuroraBackground React par du CSS pur

**⚠️ Cette tâche aurait dû être faite en Phase 1 (tâche 8) mais n'a pas été appliquée.**

**Problème** : `AuroraBackground` est un composant React qui utilise `client:only="react"`. Il ne fait que rendre un `<div>` avec des classes Tailwind pour un effet CSS. Ça force le chargement de React sur la homepage juste pour un fond décoratif.

**Solution** : Créer un composant Astro équivalent.

**Créer `src/components/AuroraBg.astro`** :
```astro
---
interface Props {
  class?: string;
}
---
<div class:list={[
  "relative flex flex-col items-center justify-center bg-zinc-50 text-slate-950 transition-[background] min-h-full",
  Astro.props.class
]}>
  <div class="absolute inset-0 overflow-hidden">
    <div class="[--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)] [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)] [background-image:var(--white-gradient),var(--aurora)] [background-size:300%,_200%] blur-[10px] invert after:content-[''] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] after:[background-size:200%,_100%] after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference pointer-events-none absolute -inset-[10px] opacity-50 will-change-transform [mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]">
    </div>
  </div>
  <div class="relative z-10 w-full">
    <slot />
  </div>
</div>
```

**Modifier `src/pages/index.astro`** :
```astro
// AVANT
import { AuroraBackground } from "../components/ui/aurora-background.tsx";
// ...
<AuroraBackground client:only="react" className="min-h-full" />

// APRÈS
import AuroraBg from "../components/AuroraBg.astro";
// ...
<AuroraBg class="min-h-full" />
```

**Faire pareil dans `src/pages/fr/index.astro`** si ce fichier existe encore (il devrait avoir été supprimé en Phase 1, mais vérifier).

**Supprimer** `src/components/ui/aurora-background.tsx` après remplacement.

**Vérifier** que les variables CSS dans `global.css` (`:root` block avec `--white`, `--blue-500`, etc.) et l'animation `aurora` sont toujours présentes.

**Impact** : Supprime le chargement de React côté client pour la homepage (sauf BookingWizard et LocationCarousel qui en ont réellement besoin).

**Commit** : `perf: replace React AuroraBackground with zero-JS Astro component`

---

### Tâche 2 : Optimiser guide-photo.webp (4.1 Mo → ~150 Ko)

**Problème** : `src/images/guide-photo.webp` fait 5472×3648px et 4.1 Mo. C'est la photo la plus importante du site (Clément en guide) mais elle n'est jamais affichée à plus de ~1920px.

**Solution** : Redimensionner et recompresser avec Sharp (déjà installé dans le projet).

**Script à exécuter :**
```bash
# Backup de l'original
cp src/images/guide-photo.webp src/images/guide-photo-original.webp

# Redimensionner à 1920px de large, qualité 80
npx sharp -i src/images/guide-photo-original.webp -o src/images/guide-photo.webp resize 1920 --withoutEnlargement --quality 80

# Si sharp CLI n'est pas dispo, utiliser un script Node :
node -e "
const sharp = require('sharp');
sharp('src/images/guide-photo-original.webp')
  .resize(1920, null, { withoutEnlargement: true })
  .webp({ quality: 80 })
  .toFile('src/images/guide-photo.webp')
  .then(info => console.log('Done:', info.size, 'bytes'))
  .catch(err => console.error(err));
"
```

**NE PAS supprimer l'original** — le garder sous un autre nom au cas où Clément en aurait besoin.

**Vérifier** : la taille résultante doit être <200 Ko. Le composant Astro `<Picture>` génèrera ensuite les variantes responsive.

**Commit** : `perf: resize guide-photo from 5472px to 1920px (-95% file size)`

---

### Tâche 3 : Optimiser toutes les photos public/photos/

**Problème** : Les photos dans `public/photos/` sont à des résolutions 3000-5000px pour des affichages max ~1280px. Elles sont servies brutes.

**Solution en deux parties :**

**Partie A — Redimensionner les photos surdimensionnées :**

```bash
# Pour chaque image >1920px de large dans public/photos/, redimensionner à 1920px max
for f in public/photos/left_bank/*.webp public/photos/right_bank/*.webp; do
  width=$(identify -format '%w' "$f" 2>/dev/null)
  if [ "$width" -gt 1920 ]; then
    echo "Resizing $f ($width px → 1920px)"
    cp "$f" "${f}.bak"
    node -e "
      require('sharp')('${f}.bak')
        .resize(1920, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile('$f')
        .then(i => console.log('  →', (i.size/1024).toFixed(0), 'KB'))
    "
  fi
done
```

**Partie B — Migrer les images du carousel vers le pipeline Astro :**

Les images du carousel (`LocationCarousel`) sont actuellement référencées via des URLs brutes (`/photos/left_bank/luxembourg_palace_paris.webp`). Pour bénéficier du pipeline Astro (`<Picture>`, srcset, AVIF) :

1. Déplacer les images du carousel de `public/photos/` vers `src/images/carousel/`
2. Les importer dans `index.astro` via `import` (ce qui les fait passer par le pipeline Astro)
3. Passer les URLs optimisées au `LocationCarousel`

**OU** (plus simple, moins de refactoring) :

Garder les images dans `public/photos/` mais ajouter un script de build qui génère des variantes responsive (640, 960, 1280px) en WebP. Puis modifier le carousel pour utiliser `srcset`.

**Choisir l'approche la plus simple** — la priorité est de réduire la taille des images, pas de refactorer le carousel.

**Supprimer le JPEG orphelin :**
```bash
rm public/photos/left_bank/Paris_WW2_tour_guided_group_photo.jpeg
```

**Supprimer les .bak après vérification visuelle.**

**Commit** : `perf: resize oversized photos and remove orphan JPEG`

---

### Tâche 4 : Self-host Montserrat et éliminer le render-blocking

**Problème** : Google Fonts charge Montserrat (2 poids) via un CSS externe render-blocking. C'est utilisé uniquement sur le hero de la homepage.

**Solution** : Télécharger les fichiers de police, les servir localement, et les charger en asynchrone.

**Étapes :**

1. **Télécharger Montserrat** :
```bash
mkdir -p public/fonts
# Télécharger les fichiers WOFF2 (format le plus compact)
curl -o public/fonts/montserrat-400.woff2 "https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-Y3tcoqK5.woff2"
curl -o public/fonts/montserrat-500.woff2 "https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtZ6Ew-Y3tcoqK5.woff2"
```

2. **Ajouter les @font-face dans `global.css`** :
```css
@font-face {
  font-family: 'Montserrat';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/montserrat-400.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Montserrat';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/montserrat-500.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

3. **Supprimer les lignes Google Fonts dans `BaseLayout.astro`** :
```astro
<!-- SUPPRIMER ces 3 lignes -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500&display=swap" rel="stylesheet" />
```

4. **Ajouter un preload** pour le poids principal (400) :
```html
<link rel="preload" href="/fonts/montserrat-400.woff2" as="font" type="font/woff2" crossorigin />
```

**Impact** : Élimine 1 requête CSS render-blocking + 2 requêtes DNS (fonts.googleapis.com, fonts.gstatic.com).

**Commit** : `perf: self-host Montserrat font, eliminate render-blocking CSS`

---

### Tâche 5 : Remplacer LocationCarousel React par une version CSS/JS légère

**Problème** : `LocationCarousel.tsx` (215 lignes React) est chargé via `client:only="react"` — il force React sur la homepage même si AuroraBackground est converti en Astro.

**Solution** : Réécrire en composant Astro + vanilla JS. Un carousel infini avec 5 cards ne nécessite pas React.

**Créer `src/components/LocationCarousel.astro`** :
- Accepte les mêmes props (`cards`, `cardsPerView`, `autoPlayMs`, `height`)
- Utilise du HTML/CSS pur pour le layout (flexbox + overflow-x + scroll-snap)
- JS vanilla pour l'autoplay et la navigation
- Animation de défilement via `scrollTo({ behavior: 'smooth' })`

**Pattern recommandé** (scroll-snap carousel) :
```html
<div class="carousel-container overflow-x-auto scroll-snap-x-mandatory flex gap-4">
  {cards.map(card => (
    <div class="carousel-card flex-shrink-0 scroll-snap-start" style={`width: calc(100% / ${cardsPerView})`}>
      <img src={card.imgUrl} alt={card.title} loading="lazy" />
      <h3>{card.title}</h3>
      <p>{card.description}</p>
    </div>
  ))}
</div>
```

**Script inline minimal** (~30 lignes) pour l'autoplay :
```html
<script>
  const container = document.querySelector('.carousel-container');
  let interval;
  function autoScroll() {
    interval = setInterval(() => {
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: container.clientWidth / cardsPerView, behavior: 'smooth' });
      }
    }, autoPlayMs);
  }
  container.addEventListener('pointerdown', () => clearInterval(interval));
  container.addEventListener('pointerup', () => autoScroll());
  autoScroll();
</script>
```

**Modifier `index.astro`** : remplacer l'import React par le composant Astro.

**Supprimer** `src/components/ui/LocationCarousel.tsx` après remplacement.

**Impact** : Si AuroraBackground (tâche 1) ET LocationCarousel (tâche 5) sont convertis, la homepage ne charge plus React côté client du tout (sauf pour le BookingWizard qui en a besoin, mais il est `client:load` donc chargé en différé).

**Commit** : `perf: replace React LocationCarousel with zero-dependency Astro carousel`

---

### Tâche 6 : Lazy-load TourMap avec un placeholder

**Problème** : `TourMap.tsx` utilise `mapbox-gl` (~200 Ko gzip). Il est chargé via `client:visible` sur les pages de tour, ce qui est déjà bien, mais on peut faire mieux.

**Solution** : Afficher un placeholder statique (image de la carte ou fond gris avec bouton "Voir la carte") et ne charger Mapbox que quand l'utilisateur interagit.

**Modifier `TourMap.tsx`** ou créer un wrapper :
```tsx
const [loaded, setLoaded] = useState(false);

if (!loaded) {
  return (
    <div 
      class="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer"
      onClick={() => setLoaded(true)}
    >
      <div class="text-center">
        <svg class="w-12 h-12 mx-auto text-gray-400 mb-2" /* map icon */ />
        <p class="text-gray-600">Click to load interactive map</p>
      </div>
    </div>
  );
}

// ... code Mapbox actuel
```

**Alternative** : Remplacer Mapbox par une image statique de la carte (screenshot) avec un lien Google Maps. Ça élimine 200Ko de JS. Mapbox est overkill pour afficher 4 points sur une carte — un lien Google Maps embed ou une image statique suffit.

**Laisser Claude Code choisir l'approche** la plus simple en fonction de la complexité actuelle du composant.

**Commit** : `perf: lazy-load TourMap with click-to-load placeholder`

---

### Tâche 7 : Optimiser key-figures (framer-motion + supabase client)

**Problème** : La page `key-figures.astro` charge 3 composants React `client:load` qui utilisent `framer-motion` (animations) et `supabase` (données client-side). C'est la page la moins visitée mais elle empêche la suppression de `framer-motion` des dépendances.

**Solution en deux parties :**

**Partie A — Migrer les données Supabase vers le serveur :**

Les composants `KeyFiguresStats`, `CountriesChart` et `WorldMap` font des requêtes Supabase côté client pour récupérer des stats (nombre de participants, pays, etc.). Ces données changent rarement — les récupérer côté serveur dans le frontmatter de `key-figures.astro` et les passer en props.

```astro
---
// key-figures.astro
import { supabase } from '../lib/supabase';

const { data: stats } = await supabase
  .from('bookings')
  .select('participants_count, customer_email')
  .eq('status', 'confirmed');

// Calculer les stats côté serveur
const totalParticipants = stats?.reduce((sum, b) => sum + b.participants_count, 0) || 0;
// etc.
---

<KeyFiguresStats client:load stats={calculatedStats} />
```

**Partie B — Remplacer framer-motion par des animations CSS :**

Les animations de framer-motion sur key-figures sont probablement des fade-in/slide-up au scroll. Remplacer par :
- `IntersectionObserver` en vanilla JS pour détecter l'entrée en viewport
- Animations CSS (`@keyframes fadeInUp`) déclenchées par l'ajout d'une classe

**Si le refactoring est trop complexe** pour cette phase, alternative minimale :
- Garder framer-motion sur key-figures uniquement
- Au moins migrer les appels Supabase vers le serveur (Partie A)
- Ajouter une note TODO pour la Partie B

**Commit** : `perf: server-side data for key-figures, replace framer-motion with CSS`

---

### Tâche 8 : Supprimer framer-motion si plus utilisé

**Condition** : Exécuter UNIQUEMENT si la tâche 7 a remplacé toutes les utilisations de framer-motion.

```bash
# Vérifier qu'il n'y a plus aucun import
grep -r "framer-motion" src/ --include="*.tsx" --include="*.ts" --include="*.astro"

# Si aucun résultat :
pnpm remove framer-motion
```

**Vérifier aussi** :
- `react-simple-maps` — peut être supprimé si WorldMap est remplacé par une image statique ou un SVG inline
- `clsx` et `tailwind-merge` — si `cn()` dans `lib/utils.ts` a été supprimé en Phase 1
- Les anciens fichiers de steps du booking (Phase 2 tâche 7 de nettoyage) — s'ils existent encore, les supprimer

**Commit** : `chore: remove framer-motion and unused dependencies`

---

### Tâche 9 : Supprimer les anciens fichiers de booking non utilisés

**Vérifier** si les anciens steps de booking existent encore :
```bash
ls src/components/BookTour/steps/
```

S'il reste des fichiers de l'ancien wizard 6 étapes (`StepTourSelection.tsx`, `StepParticipants.tsx`, `StepTourType.tsx`, `StepContact.tsx`, `StepSummary.tsx`), vérifier qu'ils ne sont importés nulle part et les supprimer.

Vérifier aussi que `src/components/ui/aurora-background.tsx` et `src/components/ui/background-gradient-animation.tsx` sont supprimés.

**Commit** : `chore: remove dead component files`

---

### Tâche 10 : Audit final et mesures

**Actions :**

1. **Mesurer la taille du build** :
```bash
pnpm build
du -sh dist/
find dist/ -name "*.js" | xargs du -sh | sort -rh | head -10
find dist/ -name "*.css" | xargs du -sh | sort -rh | head -5
```

2. **Vérifier les images** :
```bash
# Aucune image >300Ko dans le build
find dist/ -name "*.webp" -o -name "*.avif" -o -name "*.jpg" -o -name "*.png" | xargs du -sh | sort -rh | head -10
```

3. **Vérifier les imports client** :
```bash
# Plus de supabase dans les composants
grep -r "supabase" src/components/ --include="*.tsx" --include="*.ts"

# Plus de framer-motion
grep -r "framer-motion" src/ --include="*.tsx" --include="*.ts"

# Compter les client: directives restantes
grep -rn "client:" src/ --include="*.astro"
```

4. **Lister les client: directives restantes** — après toutes les optimisations, les seules directives client acceptables sont :
- `BookingWizard client:load` — le wizard de booking DOIT être React (state management, Stripe, calendrier)
- `TourMap client:visible` — Mapbox si gardé (ou supprimé si remplacé par une image)
- Éventuellement les composants key-figures si framer-motion est gardé

5. **Build final** :
```bash
pnpm build
# Doit passer sans erreur ni warning
```

**Commit** : `chore: Phase 3 audit — document final metrics`

---

## Validation finale Phase 3

```bash
# 1. Build propre
pnpm build

# 2. Taille des assets
find dist/ -name "*.js" -exec du -sh {} + | sort -rh | head -5
# Aucun fichier JS >100Ko (sauf react-dom si encore utilisé)

# 3. Taille des images
find dist/ public/photos -name "*.webp" -exec du -sh {} + | sort -rh | head -5
# guide-photo < 200Ko
# Aucune photo > 400Ko

# 4. Pas de render-blocking fonts
grep -r "fonts.googleapis" src/layouts/
# Doit retourner 0 résultats

# 5. Imports client minimaux
grep -rn "client:" src/ --include="*.astro"
# Seuls BookingWizard (client:load) et éventuellement TourMap (client:visible) restent

# 6. Pas de supabase côté client (hors booking wizard qui utilise les API routes)
grep -r "from.*supabase" src/components/ --include="*.tsx"
# Seuls les nouveaux steps de booking via fetch('/api/...') sont acceptables

# 7. Vérification visuelle
# → La homepage s'affiche correctement (aurora, carousel, booking)
# → Les pages de tour s'affichent correctement (hero, stops, map, booking)
# → Le booking complet fonctionne (Regular + Private, Stripe + sur place)
# → Les animations key-figures fonctionnent (si gardées)
```

---

## Ordre d'exécution pour Claude Code

```
Tâche 1  → AuroraBackground React → CSS pur (quick win, gros impact)
Tâche 2  → guide-photo.webp 4.1Mo → ~150Ko
Tâche 3  → Redimensionner toutes les photos surdimensionnées
Tâche 4  → Self-host Montserrat, supprimer Google Fonts
Tâche 5  → LocationCarousel React → Astro vanilla
Tâche 6  → Lazy-load TourMap
Tâche 7  → Key-figures : server-side data + CSS animations
Tâche 8  → Supprimer framer-motion (si possible)
Tâche 9  → Supprimer fichiers morts
Tâche 10 → Audit final
```

Chaque tâche = un commit atomique. Tester le build après chaque commit.

---

## Rappels importants

- **NE JAMAIS** supprimer ou remplacer les photos de Clément — uniquement redimensionner et recompresser
- **GARDER** les backups des originaux sous un nom différent (ex: `guide-photo-original.webp`)
- **Sharp** est déjà installé (`sharp@0.34.3` dans package.json) — l'utiliser pour les transformations d'images
- **Le BookingWizard DOIT rester en React** — c'est le seul composant qui a légitimement besoin de state management complexe (Stripe, calendrier, multi-étapes)
- **Vérifier les deux langues** (EN/FR) après chaque modification de composant partagé
