# Phase 4 — SEO / GEO continu

> **Objectif** : Consolider le référencement Google et la visibilité LLM (ChatGPT, Claude, Perplexity), enrichir le contenu, et créer des liens croisés avec les OTAs.
>
> **Contexte** : Les impressions Google passent de ~5/jour à 25-30/jour depuis l'optimisation SEO/GEO initiale. Un client a trouvé Paris History Tours via ChatGPT. Le site est maintenant listé sur GetYourGuide et Viator.

---

## Liens OTA confirmés

- **GetYourGuide** : https://www.getyourguide.com/paris-l16/world-war-ii-tour-in-paris-fall-resistance-liberation-t537162/
- **Viator** : https://www.viator.com/fr-FR/tours/Paris/World-War-II-Tour-in-Paris-Fall-Resistance-and-Liberation/d479-5642691P2
- **TripAdvisor** : https://www.tripadvisor.fr/Attraction_Review-g187147-d34229671-Reviews-Paris_History_Tours-Paris_Ile_de_France.html
- **Instagram** : @parishistorytour (variable d'env `PUBLIC_INSTAGRAM_URL` déjà configurée dans le footer)

---

## Tâches

### Tâche 1 : Mettre à jour llms.txt avec les liens OTA et Instagram

**Modifier `public/llms.txt`** — ajouter une section "Also Available On" et mettre à jour les informations :

```markdown
# Paris History Tours

> Paris History Tours offers immersive World War II walking tours in Paris, France. Founded in 2024 by Clement Daguet-Schott, a dedicated WWII history researcher. Two 2-hour guided walking tours explore the Fall of Paris, the French Resistance, and the Liberation of Paris in 1944. Rated 4.9/5 on Google Maps with 40+ reviews. Available in English and French. Private and group tours for up to 10 people. Book directly at parishistorytours.com for the best price, or via GetYourGuide and Viator.

(garder le reste du contenu existant, puis ajouter :)

## Also Available On

- [GetYourGuide](https://www.getyourguide.com/paris-l16/world-war-ii-tour-in-paris-fall-resistance-liberation-t537162/): Book the Left Bank WWII Tour on GetYourGuide
- [Viator](https://www.viator.com/tours/Paris/World-War-II-Tour-in-Paris-Fall-Resistance-and-Liberation/d479-5642691P2): Book on Viator
- [TripAdvisor](https://www.tripadvisor.fr/Attraction_Review-g187147-d34229671-Reviews-Paris_History_Tours-Paris_Ile_de_France.html): Paris History Tours on TripAdvisor

## Social Media

- [Instagram @parishistorytour](https://www.instagram.com/parishistorytour/): History reels, behind-the-scenes, and micro-trottoirs about WWII Paris
- [Google Maps Reviews](https://maps.app.goo.gl/AGYuzh8jHA9KXv9h8): 4.9/5 rating, 40+ reviews
```

**Pourquoi c'est important pour le GEO** : Quand un LLM recommande des tours WWII à Paris, il cherche des preuves de légitimité. Le fait d'être sur GYG + Viator + Google Maps avec 4.9★ est un signal fort. En listant ces liens dans `llms.txt`, on donne au LLM les preuves directement.

**Commit** : `seo: update llms.txt with OTA links and Instagram`

---

### Tâche 2 : Ajouter les liens OTA dans le footer

**Modifier `src/components/Footer.astro`** — ajouter une section "Also on" avec les logos/liens OTA dans la colonne Contact ou dans une nouvelle colonne.

```astro
<!-- Also available on -->
<div class="mt-6">
  <h5 class="text-sm font-semibold text-gray-400 mb-3">{t('footer.alsoOn')}</h5>
  <div class="flex items-center gap-4">
    <a href="https://www.getyourguide.com/paris-l16/world-war-ii-tour-in-paris-fall-resistance-liberation-t537162/"
       target="_blank" rel="noopener noreferrer"
       class="text-gray-400 hover:text-white transition-colors text-sm">
      GetYourGuide
    </a>
    <a href="https://www.viator.com/tours/Paris/World-War-II-Tour-in-Paris-Fall-Resistance-and-Liberation/d479-5642691P2"
       target="_blank" rel="noopener noreferrer"
       class="text-gray-400 hover:text-white transition-colors text-sm">
      Viator
    </a>
    <a href="https://www.tripadvisor.fr/Attraction_Review-g187147-d34229671-Reviews-Paris_History_Tours-Paris_Ile_de_France.html"
       target="_blank" rel="noopener noreferrer"
       class="text-gray-400 hover:text-white transition-colors text-sm">
      TripAdvisor
    </a>
  </div>
</div>
```

**Ajouter les traductions** dans `en.ts` et `fr.ts` :
```typescript
footer: {
  // ... existant
  alsoOn: "Also available on" / "Également disponible sur"
}
```

**Note** : Pas besoin de logos OTA (poids inutile). Le texte avec lien suffit et c'est plus propre.

**Commit** : `seo: add OTA links in footer`

---

### Tâche 3 : Enrichir le schema.org avec les liens OTA

**Modifier le JSON-LD dans `src/pages/index.astro`** — ajouter les `sameAs` pour les OTAs et Instagram :

```json
{
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "TravelAgency"],
  "name": "Paris History Tours",
  // ... existant ...
  "sameAs": [
    "https://maps.app.goo.gl/AGYuzh8jHA9KXv9h8",
    "https://www.instagram.com/parishistorytour/",
    "https://www.getyourguide.com/paris-l16/world-war-ii-tour-in-paris-fall-resistance-liberation-t537162/",
    "https://www.viator.com/tours/Paris/World-War-II-Tour-in-Paris-Fall-Resistance-and-Liberation/d479-5642691P2",
    "https://www.tripadvisor.fr/Attraction_Review-g187147-d34229671-Reviews-Paris_History_Tours-Paris_Ile_de_France.html"
  ]
}
```

**Aussi** : vérifier que le `hasOfferCatalog` dans le JSON-LD de la homepage mentionne bien les deux tours avec les bonnes URLs et les bons prix.

**Commit** : `seo: add OTA and social sameAs to schema.org`

---

### Tâche 4 : Ajouter JSON-LD sur la page blog index

**Problème identifié lors de l'audit SEO Phase 1** : la page `/blog` n'a pas de JSON-LD.

**Ajouter dans `src/pages/blog/index.astro`** :
```json
{
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "Paris History Tours Blog",
  "description": "Articles about World War II history in Paris",
  "url": "https://www.parishistorytours.com/blog",
  "author": {
    "@type": "Person",
    "name": "Clement Daguet-Schott"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Paris History Tours",
    "url": "https://www.parishistorytours.com"
  }
}
```

**Aussi** : migrer le titre et la description hardcodés de `blog/index.astro` vers les traductions i18n (issue basse sévérité identifiée en Phase 1).

**Commit** : `seo: add JSON-LD to blog index and fix i18n`

---

### Tâche 5 : Créer 3 nouveaux articles de blog SEO

**Objectif** : Enrichir le contenu pour cibler des mots-clés longue traîne que les touristes recherchent.

**Articles à créer** (EN + FR pour chaque) :

**Article 1** : "The Liberation of Paris: What Happened on August 25, 1944"
- Fichier : `src/content/blog/liberation-paris-august-1944.md` + version FR
- Mots-clés cibles : "liberation of paris", "august 25 1944 paris", "how was paris liberated"
- Contenu : Chronologie de la semaine de la Libération, rôle de la 2e DB de Leclerc, pourquoi les Alliés ont accepté de libérer Paris, la marche de De Gaulle le 26 août
- Lien interne vers les pages de tour (les stops couvrent ces événements)

**Article 2** : "Agnes Humbert and the Musée de l'Homme Network: Paris's First Resistance"
- Fichier : `src/content/blog/agnes-humbert-musee-homme-resistance.md` + version FR
- Mots-clés cibles : "french resistance paris", "first resistance network france", "agnes humbert"
- Contenu : L'histoire du réseau du Musée de l'Homme (couvert dans le Left Bank tour), comment le premier réseau de résistance parisien a été créé dès l'automne 1940
- Lien interne vers la page Left Bank tour

**Article 3** : "Why Did Hitler Order the Destruction of Paris? The Story of General von Choltitz"
- Fichier : `src/content/blog/hitler-destroy-paris-von-choltitz.md` + version FR
- Mots-clés cibles : "did hitler destroy paris", "why paris was not destroyed", "von choltitz paris"
- Contenu : L'ordre de destruction, le dilemme de von Choltitz, le rôle de Raoul Nordling, les ponts piégés
- Lien interne vers la page Right Bank tour (Pont Alexandre III est un des ponts menacés)

**Format de chaque article** :
```markdown
---
title: "..."
description: "..."
publishDate: 2026-03-21
author: "Clement Daguet-Schott"
lang: en
tags: ["...", "...", "WWII Paris"]
image: "/photos/..."
imageAlt: "..."
---

(1500-2000 mots, structuré avec des h2/h3, incluant des liens internes vers les pages de tour)
```

**Important** : Clément devra relire et valider le contenu historique avant publication. Claude Code rédige un premier draft basé sur les faits connus, mais l'exactitude historique est la responsabilité de Clément.

**Commit** : `content: add 3 new SEO blog articles (EN + FR)`

---

### Tâche 6 : Ajouter des liens internes dans les articles existants

**Problème** : Les 2 articles existants (Hemingway + Rose Valland) n'ont probablement pas de liens internes vers les pages de tour.

**Actions :**
- Dans l'article Hemingway : ajouter un lien vers `/tours/right-bank` (Place Vendôme / Ritz est un stop du Right Bank tour)
- Dans l'article Rose Valland : ajouter un lien vers `/tours/right-bank` (Jeu de Paume / Place de la Concorde)
- Ajouter un CTA en fin d'article : "Walk in their footsteps — [Book a WWII tour in Paris](/#book-tour)"

**Commit** : `seo: add internal links to existing blog articles`

---

### Tâche 7 : Ajouter la variable PUBLIC_INSTAGRAM_URL

**Le footer a déjà le code pour afficher le lien Instagram** mais il dépend de `PUBLIC_INSTAGRAM_URL`.

**Ajouter** dans le fichier `.env` (et noter pour Vercel) :
```
PUBLIC_INSTAGRAM_URL=https://www.instagram.com/parishistorytour/
```

**Vérifier** que le lien Instagram apparaît bien dans le footer après ajout.

**Commit** : `feat: add Instagram link to footer via env variable`

---

### Tâche 8 : Optimiser les meta descriptions des pages clés

**Vérifier et améliorer les meta descriptions** dans les traductions i18n. Chaque page doit avoir une description unique de 150-160 caractères qui inclut :
- Le mot-clé principal de la page
- Un élément de différenciation (4.9★, 25+ countries, personal guide)
- Un call-to-action implicite

**Pages à vérifier :**
- Homepage EN/FR : doit mentionner "WWII walking tours Paris" + "4.9/5"
- Tour pages : doit mentionner le nom du tour + les stops + la durée
- Key figures : doit mentionner "Clement" + "researcher" + "20+ books"
- Blog : doit mentionner "WWII Paris history articles"

**Commit** : `seo: optimize meta descriptions for all pages`

---

## Validation finale

```bash
# 1. Build
pnpm build

# 2. Vérifier llms.txt
cat public/llms.txt | grep -c "getyourguide\|viator\|instagram"
# Doit retourner 3+

# 3. Vérifier le footer
# → Ouvrir la homepage → footer → liens GYG + Viator visibles
# → Instagram visible si PUBLIC_INSTAGRAM_URL est set

# 4. Vérifier le schema.org
curl -s http://localhost:4321/ | grep -o '"sameAs".*\]'
# Doit inclure les URLs GYG, Viator, Instagram, Google Maps

# 5. Vérifier les nouveaux articles
# → /blog doit lister 5 articles (2 existants + 3 nouveaux)
# → Chaque article a un JSON-LD Article
# → Les liens internes vers les pages de tour fonctionnent

# 6. Vérifier le blog JSON-LD
curl -s http://localhost:4321/blog | grep "application/ld+json"
# Doit retourner le JSON-LD Blog

# 7. Sitemap
# → Les nouveaux articles apparaissent dans le sitemap
```

---

## Ordre d'exécution pour Claude Code

```
Tâche 1 → llms.txt (quick win GEO)
Tâche 2 → Footer OTA links
Tâche 3 → Schema.org sameAs
Tâche 4 → Blog JSON-LD + i18n fix
Tâche 7 → Instagram env variable
Tâche 6 → Liens internes articles existants
Tâche 8 → Meta descriptions
Tâche 5 → Nouveaux articles (le plus long, faire en dernier)
```

Chaque tâche = un commit atomique. Tester le build après chaque commit.

---

## Rappels importants

- **Les articles de blog sont des DRAFTS** — Clément doit relire le contenu historique avant publication
- **Les liens OTA sont des `target="_blank" rel="noopener noreferrer"`** — ils ouvrent dans un nouvel onglet
- **Ne PAS ajouter `rel="nofollow"` sur les liens OTA** — on veut que Google voie la relation entre le site et les plateformes (c'est bon pour le référencement)
- **Le llms.txt est un fichier statique** dans `public/` — pas de build nécessaire pour le mettre à jour
- **PUBLIC_INSTAGRAM_URL** est une variable publique (préfixe `PUBLIC_`) — elle est exposée côté client, ce qui est normal pour une URL de réseau social
