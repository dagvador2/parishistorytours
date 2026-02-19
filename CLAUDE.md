# CLAUDE.md — Paris History Tours

> Site : https://www.parishistorytours.com/
> Stack : Astro
> Thème : Visites guidées privées WW2 à Paris (Left Bank & Right Bank)
> Guide : Clément Daguet-Schott

---

## Contexte Projet

Le SEO et le GEO ont déjà été optimisés.
L'objectif actuel est d'**améliorer la qualité visuelle du site** en s'appuyant sur des serveurs MCP spécialisés.

### ⚠️ Règle fondamentale sur les images

Les photos du site sont **des photos personnelles de Clément** (lui en situation de guide, ses visites, les lieux qu'il couvre). Elles constituent l'authenticité de la marque et **ne doivent jamais être remplacées**.

Actions autorisées sur les photos existantes :
- ✅ Optimiser (compression, conversion WebP/AVIF, redimensionnement)
- ✅ Améliorer (réduction de bruit, correction de niveaux, suppression d'artefacts)
- ✅ Générer des variantes techniques (thumbnails, placeholders LQIP, srcset responsive)
- ❌ Ne JAMAIS remplacer une photo personnelle par du stock

Le stock photo ne sert qu'en **complément** :
- Illustrations d'ambiance secondaires (fonds de section, textures, arrière-plans décoratifs)
- Photos d'archive WW2 libres de droits pour enrichir le contenu blog
- Visuels génériques pour les métadonnées social (OG images de fallback)

---

## Structure actuelle du site

```
/                       → Page d'accueil (hero, carousel, avis, booking, FAQ)
/tours/left-bank        → Tour Rive Gauche (St-Michel, Luxembourg, Sorbonne, Notre-Dame)
/tours/right-bank       → Tour Rive Droite (Pont Alexandre III, Concorde, Vendôme)
/key-figures            → À propos de Clément & des tours
/blog                   → Articles
/fr                     → Version française
```

**Images actuelles identifiées :**
- `guide-photo.DG1PJDRp.webp` → Photo de Clément (portrait guide) — **NE PAS TOUCHER AU CONTENU**
- `pantheon_de_Paris.BBhblQM5.webp` → Panthéon (2000x1333)
- `place_vendome_paris.CWsiGla-.webp` → Place Vendôme (1950x1300)
- `museu_jeu_de_paume_paris.webp` → Musée du Jeu de Paume
- `right_bank/quai_orsay_paris.webp` → Quai d'Orsay
- Logo Google : `logos/Google__logo.webp`

Les images sont déjà en WebP. Le pipeline Astro utilise `/_image?href=...&w=...&h=...&q=75&f=png` pour le traitement.

---

## Stack MCP — Qualité Visuelle

### 1. ⚡ WebPerfect MCP — Optimisation du pipeline image

**Repo :** `splendasucks/webperfect-mcp-server`
**Rôle :** Optimiser les photos personnelles de Clément sans altérer leur contenu : réduction de bruit, auto-niveaux, suppression d'artefacts, conversion au format le plus performant, redimensionnement intelligent.

```json
{
  "mcpServers": {
    "webperfect": {
      "command": "node",
      "args": ["./node_modules/webperfect-mcp-server/build/index.js"]
    }
  }
}
```

**Presets recommandés :**
- `web_high_quality` (3840px, WebP 90%) → hero images (guide-photo, panoramas)
- `web_standard` (1920px, WebP 85%) → images de section (Panthéon, Vendôme…)
- `thumbnail` (400px) → miniatures de sélection de tour dans le booking stepper

**Actions prioritaires :**
- Vérifier que le paramètre Astro `q=75` est optimal ou si on peut descendre à `q=65` sans perte visible
- Générer des `srcset` multiples (640, 960, 1280, 1920) pour le responsive
- S'assurer que `f=png` dans les URLs Astro est bien nécessaire (WebP natif serait plus léger)

---

### 2. 🗜️ MCP Image Compression — Compression intelligente batch

**Repo :** `InhiblabCore/mcp-image-compression`
**Rôle :** Compression multi-format offline (JPEG, PNG, WebP, AVIF) avec sélection auto des paramètres selon le contenu de chaque image. Fonctionne en batch sur tout le dossier `/photos` et `/_astro`.

```json
{
  "mcpServers": {
    "image-compression": {
      "command": "npx",
      "args": ["-y", "@inhiblab-core/mcp-image-compression"],
      "env": {
        "IMAGE_COMPRESSION_DOWNLOAD_DIR": "./public/photos/optimized"
      }
    }
  }
}
```

**Cas d'usage :**
- Batch compress toutes les photos existantes du dossier `public/photos/`
- Générer des versions AVIF en plus du WebP existant (gain ~30% supplémentaire)
- Créer des placeholders LQIP (Low Quality Image Placeholder) pour le lazy loading du carousel hero

---

### 3. 🖼️ MCP Image Optimizer — Transformations avancées

**Repo :** `piephai/mcp-image-optimizer`
**Rôle :** Transformations fines basées sur Sharp : smart crop (attention-based), auto-crop des bordures, analyse de métadonnées, redimensionnement intelligent. Utile pour adapter les photos de Clément à différents formats sans couper les sujets.

```json
{
  "mcpServers": {
    "image-optimizer": {
      "command": "npx",
      "args": ["-y", "mcp-image-optimizer"]
    }
  }
}
```

**Cas d'usage :**
- Smart crop `guide-photo` pour format carré (avatar) sans couper le visage
- Auto-crop des photos de monuments pour supprimer les marges inutiles
- Analyse des métadonnées pour vérifier les dimensions réelles vs affichées
- Génération de versions OG image (1200x630) pour le partage social

---

### 4. 🎨 Figma MCP Server — Cohérence design system

**Repo officiel :** `@figma/mcp-server`
**Repo communautaire :** `GLips/Figma-Context-MCP` (Framelink)
**Rôle :** Si un fichier Figma existe pour le site, extraire les tokens de design (couleurs, typos, espacements) et générer du code Astro/Tailwind fidèle au design. Garantir la cohérence visuelle sur toutes les pages.

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["figma-developer-mcp", "--figma-api-key=<FIGMA_TOKEN>", "--stdio"]
    }
  }
}
```

**Ou connexion remote :**
```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

**Cas d'usage Paris History Tours :**
- Extraire les variables de la charte graphique si Figma est utilisé
- Générer des composants Astro cohérents (cards de tour, hero, FAQ accordion)
- S'assurer que les couleurs et typos sont appliquées uniformément

---

### 5. 🎭 Playwright MCP — Validation visuelle & responsive

**Repo officiel :** `@playwright/mcp`
**Rôle :** Capturer le site en conditions réelles sur différents devices. Comparer les screenshots avant/après chaque modification. Détecter les problèmes de layout, d'overlap, de contraste.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

**Scénarios de test prioritaires pour parishistorytours.com :**

1. **Hero carousel** — Vérifier que les 5 images du slider ne causent pas de CLS (layout shift)
2. **Menu mobile** — Le menu hamburger ne doit pas chevaucher le hero sur iPhone SE (375px)
3. **Booking stepper** — Les 6 étapes doivent être lisibles et cliquables sur mobile
4. **Images de tour** — Vérifier le lazy loading et l'absence d'espace blanc avant chargement
5. **Footer** — Les liens WhatsApp, Email, Instagram doivent être bien espacés au touch

**Devices à tester :**
- iPhone SE (375x667) — petit mobile
- iPhone 14 (390x844) — mobile standard
- iPad (768x1024) — tablette
- Desktop (1440x900) — laptop
- Desktop large (1920x1080) — écran standard

---

### 6. 📊 PageSpeed MCP — Audit performance visuelle

**Repo :** `phialsbasement/pagespeed-mcp-server`
**Rôle :** Audits Google PageSpeed automatisés. Mesurer LCP, CLS, FID. Identifier les images trop lourdes, le CSS bloquant, les layout shifts du carousel.

```json
{
  "mcpServers": {
    "pagespeed": {
      "command": "npx",
      "args": ["-y", "pagespeed-mcp-server"]
    }
  }
}
```

**Pages à auditer en priorité :**
- `https://www.parishistorytours.com/` (homepage — priorité 1)
- `https://www.parishistorytours.com/tours/left-bank`
- `https://www.parishistorytours.com/tours/right-bank`
- `https://www.parishistorytours.com/fr` (version FR)

**Points d'attention spécifiques :**
- Le hero utilise `/_image?...&f=png` → vérifier si servir du WebP natif améliore le LCP
- Le carousel de 5 images en homepage peut impacter le CLS si pas de dimensions fixées
- Les images `q=75` pourraient être descendues à `q=65` pour gagner en poids

---

### 7. 🖼️ Stock Images MCP — Complément visuel uniquement

**Repo :** `jeanpfs/stock-images-mcp`
**Rôle :** Rechercher des photos complémentaires libres de droits. **Uniquement pour enrichir, JAMAIS pour remplacer les photos de Clément.**

```json
{
  "mcpServers": {
    "stock-images": {
      "command": "npx",
      "args": ["-y", "stock-images-mcp"],
      "env": {
        "PEXELS_API_KEY": "<PEXELS_KEY>",
        "UNSPLASH_API_KEY": "<UNSPLASH_KEY>",
        "PIXABAY_API_KEY": "<PIXABAY_KEY>"
      }
    }
  }
}
```

**Usages autorisés :**
- Photos d'archive WW2 libres de droits pour les articles de blog
- Textures et arrière-plans décoratifs (vieux papier, carte vintage de Paris)
- Visuels d'ambiance pour les OG images / partage social
- Photos de Paris en complément si une section manque de visuel

**Usages interdits :**
- ❌ Remplacer les photos de Clément en guide
- ❌ Remplacer les photos des lieux prises par Clément
- ❌ Utiliser du stock pour le hero ou le carousel principal

---

## Workflows

### 🔄 Workflow principal : "Optimisation visuelle complète"

```
1. [PageSpeed MCP]      → Audit initial de chaque page → identifier les bottlenecks
2. [Image Compression]  → Batch compress toutes les photos existantes
3. [Image Optimizer]    → Smart crop pour formats responsive + OG images
4. [WebPerfect MCP]     → Pipeline qualité (bruit, niveaux, artefacts)
5. [Playwright MCP]     → Screenshots avant/après sur 5 devices
6. [PageSpeed MCP]      → Ré-audit → vérifier amélioration des scores
```

### 🔄 Workflow : "Ajout d'une nouvelle photo de Clément"

```
1. Clément fournit la photo originale
2. [Image Optimizer]    → Analyse métadonnées, smart crop pour les différents formats
3. [Image Compression]  → Compression WebP + AVIF + LQIP placeholder
4. Intégration dans Astro avec srcset responsive
5. [Playwright MCP]     → Vérification visuelle sur mobile et desktop
```

### 🔄 Workflow : "Nouvel article de blog"

```
1. [Stock Images MCP]   → Chercher illustrations WW2 / Paris complémentaires
2. [Image Compression]  → Optimiser avant intégration
3. Rédaction et intégration dans Astro
4. [PageSpeed MCP]      → Vérifier que la page reste performante
```

---

## Règles Visuelles du Projet

### Images
- **Format par défaut :** WebP (AVIF en `<picture>` si supporté)
- **Hero / bannière :** max 1920x1080, < 150 Ko après compression
- **Photos de section :** max 1280px de large, < 100 Ko
- **Thumbnails (stepper booking) :** max 400x300, < 30 Ko
- **Lazy loading :** obligatoire sauf hero above-the-fold
- **Placeholder LQIP :** générer pour toutes les images lazy-loaded
- **`sizes` et `srcset` :** toujours spécifier pour le responsive (640, 960, 1280, 1920)

### Charte graphique (déduite du site)
- **Fond sombre :** Noir/Bleu très foncé (sections hero et features)
- **Texte principal :** Blanc sur fond sombre
- **Accents :** Doré/ambre pour les CTA et éléments interactifs
- **Cards :** Fond semi-transparent avec bordures subtiles
- **Style global :** Élégant, sobre, historique — pas de couleurs vives ni de style cartoon

### Performance
- **Score PageSpeed mobile cible :** > 90
- **LCP cible :** < 2.5s
- **CLS cible :** < 0.1
- **Total images homepage :** viser < 800 Ko au total (above + below the fold)

---

## Installation rapide (Claude Code)

```bash
# Serveurs d'optimisation image
claude mcp add webperfect -- node ./node_modules/webperfect-mcp-server/build/index.js
claude mcp add image-compression -- npx -y @inhiblab-core/mcp-image-compression
claude mcp add image-optimizer -- npx -y mcp-image-optimizer

# Design
claude mcp add figma -- npx figma-developer-mcp --figma-api-key=$FIGMA_ACCESS_TOKEN --stdio

# Validation
claude mcp add playwright -- npx -y @playwright/mcp@latest
claude mcp add pagespeed -- npx -y pagespeed-mcp-server

# Stock (complément uniquement)
claude mcp add stock-images -- npx -y stock-images-mcp
```

**Variables d'environnement requises (.env) :**

```env
UNSPLASH_API_KEY=
PEXELS_API_KEY=
PIXABAY_API_KEY=
FIGMA_ACCESS_TOKEN=
```
