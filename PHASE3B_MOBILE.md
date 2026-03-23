# Phase 3b — Mobile Performance Fixes

> **Objectif** : Passer de 80 à 90+ sur PageSpeed mobile. Ciblé sur les 4 problèmes identifiés par le rapport PageSpeed.
>
> **Rapport de référence** : Mobile 80, LCP 3.3s, CLS 0.451, FCP 2.6s

---

## Problèmes identifiés par PageSpeed

### Problème 1 — LCP image en lazy loading (CRITIQUE)
L'élément LCP sur mobile est une image du carousel (`place_vendome_paris_day.webp`). Elle a `loading="lazy"`, ce qui la retarde. PageSpeed demande `fetchpriority="high"` et pas de lazy loading sur le LCP element.

### Problème 2 — Images carousel servies brutes, trop grosses (1198 Ko d'économies)
Les 5 images du carousel sont dans `public/photos/` et servies via des `<img src="/photos/...">` bruts — pas de srcset, pas de redimensionnement responsive. Sur mobile (375px), le navigateur télécharge des images de 1280px.

Images flaggées :
- `place_concorde_paris.webp` — 330 Ko, économie estimée 287 Ko
- `pantheon_de_Paris` (via Astro pipeline) — 310 Ko affiché à 550×366, économie 279 Ko
- `bridge_alexander_third_paris.webp` — 243 Ko, économie 216 Ko
- `place_vendome_paris_day.webp` — 183 Ko, économie 123 Ko
- `notre-dame-de-paris.webp` — 160 Ko, économie 135 Ko
- `luxembourg_palace_paris.webp` — 165 Ko, économie 112 Ko
- `Google__logo.webp` — 12.6 Ko affiché à 42×42, source 768×768

### Problème 3 — CLS 0.451 (CRITIQUE)
Le carousel n'a pas de dimensions réservées. Quand les images se chargent, le layout saute massivement. Le CLS cible est <0.1.

### Problème 4 — Chaîne critique longue (1012ms)
La chaîne critique inclut :
- `/api/google-reviews` — 1012ms de latence (appel API réseau)
- 2 fichiers CSS : `_slug_.DPa2RSxr.css` (10.3 Ko) + `index.Nl7bGCZw.css` (2.2 Ko) — render-blocking
- BookingWizard.js → jsx-runtime.js → chaîne de deps React

---

## Tâches

### Tâche 1 : Fixer le LCP — eager loading + fetchpriority sur la première image du carousel

**Problème** : Toutes les images du carousel ont `loading="lazy"`. La première image visible est le LCP element et ne doit PAS être lazy.

**Modifier le composant carousel** (`src/components/LocationCarousel.astro` ou équivalent) :

- La PREMIÈRE image du carousel doit avoir `loading="eager"` et `fetchpriority="high"`
- Toutes les autres images gardent `loading="lazy"`

```html
<!-- Première image (LCP) -->
<img 
  src="..." 
  alt="..." 
  loading="eager" 
  fetchpriority="high"
  decoding="async"
/>

<!-- Images suivantes -->
<img 
  src="..." 
  alt="..." 
  loading="lazy" 
  decoding="async"
/>
```

**De plus** : ajouter un `<link rel="preload">` dans `BaseLayout.astro` ou `index.astro` pour la première image du carousel — ça dit au navigateur de la télécharger immédiatement :

```html
<link rel="preload" as="image" href="/photos/left_bank/luxembourg_palace_paris.webp" />
```

(Vérifier quelle est la première image affichée dans le carousel — c'est celle-là qu'il faut preload.)

**Commit** : `perf: eager load LCP carousel image with fetchpriority=high`

---

### Tâche 2 : Migrer les images du carousel vers le pipeline Astro avec srcset

**Problème** : Les images du carousel sont servies via `<img src="/photos/...">` bruts. Le navigateur mobile télécharge des images 1280px pour un affichage de ~375px.

**Solution** : Déplacer les images du carousel dans `src/images/carousel/` et utiliser le composant `<Picture>` d'Astro qui génère automatiquement srcset + formats AVIF/WebP.

**Étapes :**

1. **Créer le dossier et copier les images** :
```bash
mkdir -p src/images/carousel
cp public/photos/left_bank/luxembourg_palace_paris.webp src/images/carousel/
cp public/photos/right_bank/place_vendome_paris_day.webp src/images/carousel/
cp public/photos/left_bank/notre-dame-de-paris.webp src/images/carousel/
cp public/photos/right_bank/bridge_alexander_third_paris.webp src/images/carousel/
cp public/photos/right_bank/place_concorde_paris.webp src/images/carousel/
```

2. **Modifier le carousel** pour utiliser le composant Astro `<Picture>` au lieu de `<img>` brut :

Si le carousel est un composant Astro (`LocationCarousel.astro`), importer les images et utiliser `<Picture>` :
```astro
---
import { Picture } from "astro:assets";
import luxembourgPalace from "../images/carousel/luxembourg_palace_paris.webp";
// ... autres imports
---

<Picture
  src={luxembourgPalace}
  alt="Panthéon"
  widths={[375, 640, 768, 1024]}
  sizes="(max-width: 768px) 100vw, 33vw"
  formats={["avif", "webp"]}
  loading="eager"
  quality={75}
  class="w-full h-full object-cover"
/>
```

Si le carousel passe les images en props (comme l'actuel qui reçoit un tableau de `cards` avec `imgUrl`), il faudra refactorer pour passer des objets `ImageMetadata` importés au lieu d'URLs string. **Alternative plus simple** : générer les variantes responsive au build et passer les srcsets en props.

**Alternative si le refactoring du carousel est trop complexe** : Utiliser Sharp pour générer des versions mobile (640px) des 5 images du carousel, et utiliser `srcset` manuellement :
```bash
# Générer des versions mobile
for f in luxembourg_palace_paris place_vendome_paris_day notre-dame-de-paris bridge_alexander_third_paris place_concorde_paris; do
  node -e "require('sharp')('public/photos/*/\${f}.webp').resize(640).webp({quality:75}).toFile('public/photos/mobile/\${f}-640.webp')"
done
```

Puis dans le carousel :
```html
<img 
  src="/photos/right_bank/place_vendome_paris_day.webp"
  srcset="/photos/mobile/place_vendome_paris_day-640.webp 640w, /photos/right_bank/place_vendome_paris_day.webp 1280w"
  sizes="(max-width: 768px) 100vw, 33vw"
/>
```

**Choisir l'approche la plus simple qui fonctionne.**

**Commit** : `perf: add responsive srcset to carousel images`

---

### Tâche 3 : Fixer le CLS — réserver les dimensions du carousel

**Problème** : CLS 0.451 — le carousel n'a pas de hauteur réservée, il saute au chargement des images.

**Solution** : Donner au conteneur du carousel un `aspect-ratio` ou une hauteur fixe AVANT le chargement des images.

**Modifications dans le carousel :**

1. **Le conteneur principal** doit avoir une hauteur fixe en CSS :
```css
/* Mobile */
.carousel-container {
  height: 20rem; /* hauteur fixe sur mobile */
  overflow: hidden;
}

/* Desktop */
@media (min-width: 768px) {
  .carousel-container {
    height: 30rem;
  }
}
```

2. **Chaque card** doit avoir un `aspect-ratio` ou des dimensions fixes :
```css
.carousel-card img {
  aspect-ratio: 3/4; /* ou 16/9 selon le format actuel */
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

3. **Pas de `min-height` dynamique** — utiliser `height` fixe pour que le navigateur réserve l'espace avant le chargement.

4. **Les images doivent avoir les attributs `width` et `height`** dans le HTML :
```html
<img src="..." width="640" height="480" alt="..." class="w-full h-full object-cover" />
```
Même si le CSS override les dimensions, le navigateur utilise width/height pour calculer l'aspect ratio et réserver l'espace.

**Commit** : `perf: fix CLS by reserving carousel dimensions`

---

### Tâche 4 : Différer le chargement de Google Reviews

**Problème** : `/api/google-reviews` est dans la chaîne critique avec 1012ms de latence. C'est un appel API qui bloque le rendu.

**Vérifier comment les reviews sont chargées** :
```bash
grep -rn "google-reviews" src/ --include="*.astro" --include="*.tsx" --include="*.ts"
```

**Solutions selon le cas :**

**Cas A — Si les reviews sont fetch côté serveur (dans le frontmatter Astro)** :
Le fetch ralentit le TTFB de la page. Solutions :
- Mettre en cache les reviews (les stocker dans un fichier JSON statique, régénéré périodiquement)
- Ou passer le fetch côté client avec `client:visible` pour ne charger les reviews que quand l'utilisateur scrolle

**Cas B — Si les reviews sont fetch côté client (via un script)** :
S'assurer que le script est `defer` ou `async` et ne bloque pas le rendu initial.

**Solution recommandée** : Hardcoder les reviews dans les traductions (elles changent rarement) ou les fetch côté client au scroll. Les avis Google ne changent pas à chaque visite — un cache de 24h est parfaitement acceptable.

**Commit** : `perf: defer Google Reviews loading to reduce critical chain`

---

### Tâche 5 : Optimiser le Google logo et les images résiduelles

**Problème** : `Google__logo.webp` est 768×768 mais affiché à 42×42. Aussi, le `pantheon_de_Paris` via le pipeline Astro est affiché à 550×366 mais la source est 2000×1020.

**Actions :**

1. **Redimensionner le logo Google** :
```bash
node -e "require('sharp')('public/logos/Google__logo.webp').resize(84,84).webp({quality:80}).toFile('public/logos/Google__logo_sm.webp')"
```
Puis mettre à jour la référence dans `Reviews.astro`. (84px = 42px × 2 pour retina)

2. **Vérifier que le composant `<Picture>` dans `ToursAvailable.astro`** génère bien des variantes responsive pour le Panthéon. Si le `sizes` attribute est correct (`(max-width: 768px) 100vw, 50vw`), Astro devrait servir la bonne taille. Sinon, ajouter des `widths` plus petits :
```astro
<Picture
  src={pantheon}
  widths={[375, 480, 640, 768, 1024]}
  sizes="(max-width: 768px) 100vw, 50vw"
  formats={["avif","webp"]}
  quality={70}
/>
```

3. **Réduire la qualité des images de carousel à `quality: 70`** au lieu de 75-80 — la différence visuelle est imperceptible mais le gain de poids est significatif sur mobile.

**Commit** : `perf: optimize Google logo and residual oversized images`

---

### Tâche 6 : Inliner le CSS critique (optionnel, si score <90 après les tâches précédentes)

**Problème** : 2 fichiers CSS render-blocking (`_slug_.css` 10.3 Ko + `index.css` 2.2 Ko).

**Solution** : Astro peut inliner le CSS critique automatiquement. Vérifier si `astro.config.mjs` a l'option :
```js
build: {
  inlineStylesheets: 'auto' // ou 'always' pour forcer
}
```

Si pas configuré, ajouter. Ça inlinera les styles critiques dans le HTML et chargera le reste en async.

**Commit** : `perf: inline critical CSS`

---

## Validation

```bash
pnpm build

# Vérifier qu'aucune image du carousel n'a loading="lazy" sur le premier élément visible
grep -A2 "carousel" dist/**/*.html | grep "loading="

# Vérifier les dimensions des images
find public/photos -name "*.webp" -exec identify -format "%f %wx%h %b\n" {} \; | sort -t' ' -k3 -rh | head -10

# Vérifier le CLS — les images carousel ont width/height attributes
grep -o 'img[^>]*carousel[^>]*' dist/**/*.html | head -5
```

Après déploiement, relancer PageSpeed mobile sur `https://www.parishistorytours.com/`.

**Cibles :**
- Performance mobile : >90
- LCP : <2.5s
- CLS : <0.1
- FCP : <1.8s

---

## Ordre d'exécution

```
Tâche 1 → LCP eager loading (quick fix, gros impact sur LCP)
Tâche 3 → CLS dimensions réservées (quick fix, gros impact sur CLS)
Tâche 2 → srcset responsive carousel (impact sur poids images)
Tâche 4 → Différer Google Reviews (impact sur chaîne critique)
Tâche 5 → Logo Google + images résiduelles (finition)
Tâche 6 → CSS inline (uniquement si nécessaire)
```

Chaque tâche = un commit atomique. Tester le build après chaque commit.
