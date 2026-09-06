# Prompts Claude Code — Produit "Self-Guided Tour" (WWII Left Bank)

> Trois sessions Claude Code distinctes, à lancer dans cet ordre.
> Chaque prompt est autonome : copie-colle le bloc entier dans une nouvelle session.
>
> **Repo cible** : `parishistorytours` (Astro 5.x + React + Tailwind 4 + Supabase + Stripe + Resend + Vercel + Mapbox)
>
> | Prompt | Branche | Livrable | Sessions estimées |
> |---|---|---|---|
> | **A — Audio** | `feature/self-guided-audio` | 18 MP3 + manifest JSON avec timestamps, sur R2 | 1–2 |
> | **B — Webapp** | `feature/self-guided-webapp` | Webapp audioguide fonctionnelle (géoloc + PWA) | 3–4 |
> | **C — Commerce** | `feature/self-guided-commerce` | Page produit + Stripe + accès par token + email | 2–3 |
>
> A et B peuvent se paralléliser au début. B a besoin du manifest de A pour être finalisé. C a besoin de B.

---

## Avant de commencer — fichiers à préparer

Place ces fichiers dans le repo avant de lancer le Prompt A :

```
scripts/audio-source/left-bank-ww2/
├── en/
│   ├── 01_Intro.txt
│   ├── 02_Stop1_Context_of_War.txt
│   ├── 03_Stop2_Fall_of_Paris.txt
│   ├── 04_Interstop_Odeon.txt
│   ├── 05_Stop3_Resistance_Agnes_Humbert.txt
│   ├── 06_Interstop_Sorbonne_Facade.txt
│   ├── 07_Interstop_Observatory_Tower.txt
│   ├── 08_Interstop_Saint_Severin_Barricades.txt
│   └── 09_Stop4_Liberation.txt
└── fr/
    ├── 01_Intro.txt
    ├── 02_Arret1_Contexte_de_la_Guerre.txt
    ├── 03_Arret2_Chute_de_Paris.txt
    ├── 04_Interstop_Odeon.txt
    ├── 05_Arret3_Resistance_Agnes_Humbert.txt
    ├── 06_Interstop_Sorbonne_Facade.txt
    ├── 07_Interstop_Tour_Observatoire.txt
    ├── 08_Interstop_Saint_Severin_Barricades.txt
    └── 09_Arret4_Liberation.txt
```

(→ contenu du zip `Audio_Scripts_v2_EN_FR.zip`)

Et le handoff Claude Design, dézippé, dans :

```
design/audioguide-handoff/
├── README.md
├── AudioGuide.dc.html
├── V1 Overview.dc.html
├── tour-content.js
├── tour-text.txt
├── photos/          (33 PNG)
└── WW2_Left_Bank_Tour_EN_v2.pdf
```

Plus les 2 PDF v2 (EN + FR) quelque part d'accessible pour l'upload R2.

---

# PROMPT A — Génération audio (Fish Audio) & upload R2

```
# Feature: génération de l'audio du tour autoguidé + stockage R2

## Contexte

Je vends bientôt sur parishistorytours.com un produit digital : le tour autoguidé "WWII Left Bank" (PDF + 9 sections audio + webapp de guidage). Cette session ne s'occupe QUE de la production des assets audio et de leur stockage. La webapp et l'intégration commerce sont deux autres chantiers séparés.

Je veux que tu construises un pipeline réexécutable qui :
1. lit les scripts texte des 9 sections (EN + FR)
2. génère l'audio avec MA VOIX CLONÉE via Fish Audio
3. récupère les timestamps mot-à-mot du TTS
4. les mappe sur les frontières de phrases définies dans le design handoff
5. uploade les MP3 + un manifest JSON sur un bucket Cloudflare R2 dédié

Le manifest JSON avec les timestamps est LE livrable critique : la webapp affichera des sous-titres et des photos synchronisés à la narration, ce qui est impossible sans timestamps réels.

## Sources

**Scripts texte** : `scripts/audio-source/left-bank-ww2/{en,fr}/*.txt` — 9 fichiers par langue, numérotés dans l'ordre du parcours. Ils sont déjà "audio-ready" (formulations orales, dates en toutes lettres, aucune référence visuelle).

**Découpage en phrases** : `design/audioguide-handoff/tour-content.js` exporte `CONTENT`, un tableau de 9 entrées (une par section, dans l'ordre) :
```js
CONTENT[idx] = {
  subs: string[],                              // la narration découpée en phrases
  media: [{ at: <index dans subs>, img, cap }] // photos, ancrées à une phrase
}
```
Les `subs` sont une version condensée de la narration destinée à l'affichage en sous-titre. Les fichiers `.txt` sont la version complète destinée au TTS. **Ils ne sont pas identiques** : il faudra aligner. Voir la section "Alignement" plus bas — c'est le point délicat de ce chantier, lis-le attentivement et propose-moi ta stratégie avant de coder.

**PDF** : les 2 masters (EN + FR) que je te fournirai, à uploader tels quels sur R2.

## Fish Audio

Env vars (je les mettrai dans `.env` et dans Vercel — dis-moi si tu en as besoin d'autres) :
- `FISH_AUDIO_API_KEY`
- `FISH_AUDIO_VOICE_ID` (le `reference_id` de ma voix clonée)

Avant d'implémenter, **lis la documentation officielle** (https://docs.fish.audio) et vérifie par toi-même via recherche web :
- l'endpoint exact et le format de requête/réponse
- la limite de caractères par requête
- **comment obtenir les timestamps** (word-level ou sentence-level). C'est le point à valider en priorité. Si Fish Audio ne fournit pas de timestamps exploitables, dis-le moi immédiatement et propose une alternative (par exemple : forced alignment local avec `whisperx` ou `aeneas` sur l'audio généré, ce qui marche très bien et reste dans le budget).
- la gestion des erreurs et du rate limiting

Ne devine pas le format de l'API : vérifie.

## Alignement scripts ↔ sous-titres (point délicat)

Les `subs` de `tour-content.js` sont une réécriture condensée. Le TTS lira les `.txt` complets. Il faut donc, pour chaque section, produire une liste `[{ t: <secondes>, text: <phrase à afficher> }]`.

Deux stratégies possibles — **analyse-les et recommande-moi la meilleure avant de coder** :

**Option 1 — Aligner les `subs` existants sur l'audio du `.txt` complet.** On garde les sous-titres condensés de Claude Design, et on cherche pour chaque `sub` le moment de l'audio qui lui correspond (matching flou sur les mots-clés, ou forced alignment). Avantage : garde le travail éditorial du design. Risque : dérive si le `.txt` et le `sub` divergent trop.

**Option 2 — Générer les `subs` à partir des `.txt`.** On découpe le `.txt` en phrases, chaque phrase devient un sous-titre, et on a les timestamps directement. Avantage : alignement parfait par construction, et les sous-titres correspondent exactement à ce qui est dit (meilleur pour l'accessibilité). Risque : des phrases plus longues à l'écran, et il faut remapper les cues photo (`media[].at`) sur les nouveaux index.

J'ai une préférence pour l'option 2 si le remapping des photos est faisable proprement, parce qu'un sous-titre qui ne correspond pas mot pour mot à ce qu'on entend, c'est perturbant. Mais donne-moi ton avis argumenté.

Pour les cues photo : chaque entrée `media` a un `at` qui pointe vers un index de `subs`. Il faudra le convertir en timestamp `t` (le `t` de la phrase correspondante). Si tu pars sur l'option 2, il faudra réancrer chaque photo sur la phrase la plus proche sémantiquement dans le nouveau découpage — le fichier `tour-content.js` contient les légendes (`cap`) qui aident à identifier le bon moment.

## Cloudflare R2

Bucket dédié, nouveau, séparé de mes autres buckets : `parishistorytours-self-guided` (privé).

Env vars :
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME=parishistorytours-self-guided`

Utilise le SDK AWS S3 v3 (`@aws-sdk/client-s3`), compatible R2, endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`. Pour les URLs signées : `@aws-sdk/s3-request-presigner`.

Structure cible du bucket :
```
audio/left-bank-ww2/en/01-intro.mp3 … 09-liberation.mp3
audio/left-bank-ww2/fr/01-intro.mp3 … 09-liberation.mp3
manifest/left-bank-ww2/en.json
manifest/left-bank-ww2/fr.json
pdf/left-bank-ww2/en/master.pdf
pdf/left-bank-ww2/fr/master.pdf
photos/left-bank-ww2/p05_0.webp … p38_32.webp
preview/left-bank-ww2/en/intro-30s.mp3
preview/left-bank-ww2/fr/intro-30s.mp3
preview/left-bank-ww2/en/pdf-preview.pdf   (3 premières pages)
preview/left-bank-ww2/fr/pdf-preview.pdf
```

Nomme les fichiers audio en kebab-case court et stable (`01-intro`, `02-context-of-war`, `03-fall-of-paris`, `04-odeon`, `05-resistance`, `06-sorbonne-facade`, `07-observatory`, `08-saint-severin`, `09-liberation`) — identiques en EN et FR, la langue est dans le chemin. Ces noms deviennent des identifiants stables côté webapp, ils ne doivent plus changer après.

## Format du manifest

Un fichier par langue. C'est le contrat d'interface avec la webapp (chantier B) — soigne-le.

```json
{
  "product": "left-bank-ww2",
  "lang": "en",
  "generatedAt": "2026-06-01T12:00:00Z",
  "voice": { "provider": "fish-audio", "voiceId": "..." },
  "totalDurationSec": 2143.7,
  "sections": [
    {
      "id": "01-intro",
      "index": 0,
      "audio": "audio/left-bank-ww2/en/01-intro.mp3",
      "durationSec": 96.5,
      "subs": [{ "t": 0.0, "text": "..." }],
      "media": [{ "t": 61.2, "img": "photos/left-bank-ww2/p05_0.webp", "cap": "..." }]
    }
  ]
}
```

Le manifest ne contient PAS les coordonnées GPS ni les métadonnées de parcours — ça reste côté webapp (chantier B), dans un fichier de config versionné dans le repo. Le manifest ne décrit que l'audio et ce qui y est synchronisé.

## Photos

Les 33 PNG sont dans `design/audioguide-handoff/photos/`. Convertis-les en WebP, max 1200px de large, qualité ~82, et uploade-les sur R2 sous `photos/left-bank-ww2/`. Garde les noms de fichiers (`p05_0`, `p06_1`, …) — `tour-content.js` y fait référence. Plusieurs sont des scans basse résolution : ne les upscale pas, la webapp les affiche en `object-fit: cover`.

## Scripts à produire

Dans `scripts/`, en TypeScript, exécutables via `pnpm tsx` (ou l'équivalent déjà en place dans le repo — vérifie) :

- `scripts/self-guided/generate-audio.ts` — lit les .txt, chunke si nécessaire, appelle Fish Audio, assemble (ffmpeg concat), extrait les timestamps, écrit les MP3 et le manifest en local dans `scripts/self-guided/output/`
- `scripts/self-guided/build-photos.ts` — conversion PNG → WebP
- `scripts/self-guided/upload-r2.ts` — uploade tout le contenu de `output/` + les photos + les PDF vers R2
- `scripts/self-guided/make-previews.ts` — extrait 30 s de chaque intro (ffmpeg) et les 3 premières pages de chaque PDF (pdf-lib), uploade dans `preview/`

Contraintes :
- **Idempotents** : réexécutables sans casse, écrasent proprement
- **Reprenables** : si la génération plante à la section 7, ne pas tout refaire. Cache local des chunks déjà générés.
- **Verbeux** : log de progression clair (section, chunk, durée, coût estimé)
- **`--dry-run`** sur l'upload pour voir ce qui serait poussé
- **`--lang en|fr|both`** et **`--section <id>`** pour régénérer une section précise (je vais forcément vouloir corriger une phrase ou deux après écoute)
- Documente tout dans `scripts/self-guided/README.md`

## Ce que je ne veux PAS dans cette session

- Aucune modification des pages du site, des routes API, du webhook Stripe, de Supabase
- Aucun composant React
- Rien qui touche au tunnel de réservation existant

Cette session produit des assets et des scripts, point.

## Workflow

1. **Discovery** : lis le repo (structure `scripts/` existante, gestionnaire de paquets, config TS, si un client R2/S3 existe déjà quelque part). Lis `design/audioguide-handoff/README.md` et `tour-content.js`. Vérifie la doc Fish Audio par recherche web.
2. **Décisions à me soumettre AVANT de coder** :
   - Fish Audio fournit-il des timestamps exploitables ? Sinon, quelle alternative ?
   - Option 1 ou option 2 pour l'alignement des sous-titres ? Avec ton argumentaire.
   - Le format de manifest ci-dessus te semble-t-il complet pour ce dont la webapp aura besoin ?
3. **Plan de commits** (6–10 commits atomiques), que je valide
4. **Implémentation** commit par commit
5. **Test à blanc** : génère UNE section courte (`04-odeon`, ~1 min) en EN, que j'écoute et valide avant de lancer les 18
6. **Génération complète** puis upload R2

Commence par la discovery. Pose-moi toutes tes questions avant de proposer le plan.
```

---

# PROMPT B — Webapp audioguide

```
# Feature: webapp audioguide "WWII Left Bank" (mobile web app)

## Contexte

Je vends bientôt sur parishistorytours.com un tour autoguidé : le visiteur achète, reçoit un lien, et fait 2 km / 1h30 à travers 9 étapes de la Rive Gauche, guidé par son téléphone. Carte, géolocalisation, audio déclenché à l'arrivée, sous-titres et photos synchronisés.

Cette session construit LA WEBAPP. Le paiement, la page produit et l'accès par token sont un chantier séparé (prompt suivant) — ici on rend la webapp accessible à une URL de dev non protégée, et on branchera la protection ensuite.

Les assets audio sont produits par un autre chantier, déjà fait ou en cours : ils sont sur Cloudflare R2, décrits par un manifest JSON. Voir "Données" plus bas.

## Design — handoff complet fourni

Tout est dans `design/audioguide-handoff/`. **Lis `README.md` en entier avant toute chose** : c'est une spec de très haute fidélité (design tokens exacts, machine à états, comportements, edge cases, copy EN/FR verbatim).

Fichiers :
- `README.md` — la spec. Fais-en ta référence.
- `AudioGuide.dc.html` — prototype cliquable complet (markup + logique). Lis-le pour les styles exacts, les constantes `STOPS`, `ROUTE`, `T` (i18n), et les helpers `dist()` / `bearing()` / `mmss()`.
- `V1 Overview.dc.html` — planche de tous les états côte à côte. Ouvre-la pour comprendre l'ensemble.
- `tour-content.js` — modèle de contenu (sous-titres + cues photo)
- `photos/` — 33 PNG (déjà convertis en WebP et hébergés sur R2 par le chantier audio)
- `support.js` — runtime du prototype, à ignorer

**Point important, explicite dans le handoff** : ne porte PAS le runtime du prototype. Recrée le design dans l'idiome du repo (React + Tailwind, dans Astro). Le prototype est une référence visuelle et comportementale, pas du code de production.

Fidélité attendue : pixel-proche à 375×812 et 390×844, fluide entre 360 et 430 px de large, hauteur ≥ 600 px.

## Stack

Astro 5.x + React islands + Tailwind CSS 4 + Vercel. Mapbox est déjà utilisé ailleurs sur le site (vérifie comment il est configuré et réutilise le pattern / le token).

Le prototype utilise Leaflet + tuiles OSM France avec un filtre CSS. En production, utilise **Mapbox GL JS** (déjà dans le projet) et reproduis le rendu visuel décrit dans le README (section "Design tokens › Map") : teinte sépia/désaturée, fond `#EDE7DC`, pins custom.

## Route

Nouvelle page : `/self-guided-tour/access` (EN) et `/fr/self-guided-tour/access` (FR), en respectant le pattern i18n existant du repo.

Pendant cette session, la page est accessible sans authentification (on branchera le token au chantier commerce). Ajoute simplement un garde-fou temporaire : `noindex` dans les meta, et un accès conditionné à une variable d'env `SELF_GUIDED_DEV_MODE=true` pour ne pas exposer le produit en prod par accident.

## Données

**Le manifest audio** (produit par le chantier audio, sur R2) :
```
manifest/left-bank-ww2/en.json
manifest/left-bank-ww2/fr.json
```
Structure :
```json
{
  "product": "left-bank-ww2", "lang": "en", "totalDurationSec": 2143.7,
  "sections": [{
    "id": "01-intro", "index": 0,
    "audio": "audio/left-bank-ww2/en/01-intro.mp3", "durationSec": 96.5,
    "subs": [{ "t": 0.0, "text": "…" }],
    "media": [{ "t": 61.2, "img": "photos/left-bank-ww2/p05_0.webp", "cap": "…" }]
  }]
}
```

**Les métadonnées de parcours** (GPS, noms, types d'étape) : crée un fichier de config versionné dans le repo, `src/data/self-guided/left-bank-ww2.ts`, à partir des constantes `STOPS` et `ROUTE` du prototype. Ne les laisse pas en dur dans le composant — je devrai corriger les coordonnées après un test terrain.

Les 9 étapes (`kind`, `badge`, `pos`, `name` EN/FR, `place` EN/FR) et la polyline `ROUTE` de 18 points sont dans `AudioGuide.dc.html`, autour de la ligne 258. Reprends-les telles quelles. Elles sont **approximatives** : je les vérifierai sur le terrain, d'où l'importance qu'elles soient faciles à éditer.

Associe chaque étape à l'`id` de section du manifest (`01-intro` ↔ index 0, etc.).

**Servir les assets R2** : le bucket est privé. Crée une route API `GET /api/self-guided/assets?product=left-bank-ww2&lang=en` qui retourne le manifest avec toutes les URLs (audio, photos) déjà transformées en URLs signées R2 valides ~2 h. Le client ne parle jamais directement à R2.

## Ce qu'il faut construire

Suis le README du handoff pour le détail — voici la vue d'ensemble.

**Écran unique, flex vertical** : header (monogramme + titre + progression + menu) → barre de progression segmentée 9 bars → carte (flex 1) → player en bas.

**Machine à états** : `walking → arrived → playing → walking(idx+1) … → complete`

**Carte** : pins principaux vs interstops visuellement distincts, polyline du parcours, position utilisateur avec pulse, cadrage auto sur [utilisateur, prochaine étape], FAB de recentrage, carte "next stop" flottante avec distance temps réel et flèche de cap.

**Player, 4 phases** (A walking / B arrived / C expanded / C' mini) : voir le README pour chaque état, ils sont spécifiés au pixel.

**Le player étendu** est le cœur du produit : puits photo 44 % de la hauteur, légende, sous-titre centré en serif avec taille adaptative selon la longueur, barre de seek, rangée de transport en grille symétrique 48/48/64/48/48 (le bouton play doit être exactement au centre de l'écran), ligne de pied avec temps restant et étape suivante.

**Synchro** : sous-titre = dernière entrée `subs` avec `t ≤ currentTime`, photo = dernière entrée `media` avec `t ≤ currentTime`. Pilote depuis l'événement `timeupdate` de l'élément audio, jamais un `setInterval`.

**Géolocalisation** : `navigator.geolocation.watchPosition()`, geofence ~25 m pour déclencher l'état "arrived". Prévois que la précision GPS en centre-ville est mauvaise (5–50 m) : le bouton "I'm here" doit toujours être disponible en secours, et taper un pin force l'arrivée sur cette étape.

**Mode GPS refusé** : bannière, anneau creux au lieu de la flèche, distance "—", déclenchement par tap sur les pins. Toute l'expérience doit rester utilisable sans géoloc.

**Media Session API** : l'audio continue écran verrouillé et app en arrière-plan. Métadonnées : titre = nom de l'étape, artiste = "WWII Left Bank · Paris History Tours", artwork = photo courante.

**Persistance** : `phase`, `idx`, `completed`, `elapsed`, `lang`, `gpsDenied` en localStorage. Reprise à l'endroit exact après un verrouillage ou un rechargement. C'est critique : les gens verrouillent leur téléphone en marchant.

**PWA** : `manifest.json` + service worker qui met en cache les 9 MP3, les photos, les tuiles de carte du Quartier latin et l'app shell dès la première ouverture. Objectif : un touriste américain sans forfait data doit pouvoir charger la page au wifi de son hôtel, puis faire tout le tour hors ligne. Affiche un indicateur de téléchargement ("Preparing offline mode… 4/9 audio files") et un état "Ready for offline use ✓".

**i18n** : objet `T` du prototype à porter verbatim (EN + FR). Le changement de langue est instantané et persistant.

## Contraintes

- Mobile-first strict. Teste à 375×812 en priorité.
- Zones tactiles ≥ 44 px partout.
- Contrastes forts (usage en plein soleil).
- Utilisable à une main, pouce en bas d'écran.
- Pas de webfont : polices système (Georgia pour le serif, `-apple-system` pour le sans).
- Aucune régression sur le site existant : c'est une route nouvelle et isolée.
- Ne touche pas au tunnel de réservation, au webhook Stripe, à Supabase.

## Workflow

1. **Discovery** : lis le handoff en entier, puis le repo (config Astro, pattern i18n, intégration Mapbox existante, structure des composants React, conventions Tailwind). Dis-moi ce qui manque ou ce qui entre en conflit.
2. **Plan de commits** (12–18 commits atomiques), que je valide. Ordre suggéré :
   - config parcours + route API assets (avec manifest mocké si le chantier audio n'est pas fini)
   - squelette de page + header + barre de progression
   - carte Mapbox + pins + polyline + position utilisateur
   - carte "next stop" + calculs distance/cap
   - player phase A (walking)
   - player phase B (arrived)
   - player phase C (expanded) — le gros morceau
   - player phase C' (mini)
   - moteur de synchro sous-titres/photos
   - machine à états + transitions
   - géolocalisation + geofencing + mode refusé
   - Media Session API
   - persistance localStorage
   - phase D (tour complete) + menu
   - i18n FR
   - PWA + service worker + cache offline
3. **Validation** entre les groupes de commits. Je veux tester au fur et à mesure sur mon téléphone (dis-moi comment exposer le dev server — ngrok, tunnel Vercel, autre).
4. **Test terrain** : quand c'est fonctionnel, je vais marcher le tour pour de vrai avec la géoloc. On ajustera le rayon de geofence et les coordonnées après.

Commence par la discovery. Pose-moi toutes tes questions avant de proposer le plan.
```

---

# PROMPT C — Intégration commerce (page produit, Stripe, accès)

```
# Feature: commercialisation du tour autoguidé (page produit + Stripe + accès par token)

## Contexte

La webapp audioguide "WWII Left Bank" est construite et fonctionnelle (route `/self-guided-tour/access`, chantier précédent). Les assets audio sont sur R2 avec leur manifest. Il reste à la vendre.

Cette session ajoute : la page marketing, le paiement Stripe, la persistance de l'achat, l'email transactionnel, et la protection par token de la webapp.

## Positionnement produit

Le tour autoguidé est un **plan B complémentaire** au tour guidé en personne (45 €/pers, max 10 personnes, 4,9★ sur Google), pas un remplacement. Message assumé et honnête : "Rien ne vaut la balade avec moi, mais si les dates ne collent pas ou si vous préférez l'autonomie…". La version autoguidée couvre tout l'arc historique, mais les petites histoires humaines et les digressions restent réservées au tour en personne.

**Prix** : 14 € normal, 9 € en early bird pendant les 30 premiers jours après le lancement. Un seul SKU : `left-bank-ww2`. Le pack contient les deux langues.

**Ce que le client obtient** : accès permanent à la webapp (carte + géoloc + 9 audios narrés par ma voix + photos synchronisées), le PDF de 38 pages téléchargeable, et un téléchargement hors-ligne complet valable 30 jours.

## Stack existante

Astro 5.x + React + Tailwind 4 + Supabase + Stripe + Resend + Vercel.

Fichiers existants à connaître (lis-les en discovery) :
- `src/pages/api/stripe-webhook.ts` — webhook Stripe, à **étendre**, pas recréer
- `src/pages/api/create-checkout-session.ts` — checkout des tours physiques, inspiration pour la nouvelle route
- `src/pages/api/send-booking-email.ts` — pattern d'envoi Resend
- `src/components/BookTour/steps/StepCalendarRegular.tsx` — étape calendrier, où ajouter un CTA
- La structure i18n (EN par défaut, FR sous `/fr/`)

## Ce qu'il faut construire

### 1. Base de données

Migration Supabase, table `digital_purchases` :
```
id                        uuid PK default gen_random_uuid()
email                     text NOT NULL (indexé)
product_slug              text NOT NULL default 'left-bank-ww2'
stripe_session_id         text UNIQUE NOT NULL
stripe_payment_intent_id  text
access_token              text UNIQUE NOT NULL
language                  text CHECK (language IN ('en','fr')) NOT NULL
amount_paid_cents         integer NOT NULL
currency                  text NOT NULL default 'eur'
purchased_at              timestamptz NOT NULL default now()
download_expires_at       timestamptz NOT NULL
download_count            integer NOT NULL default 0
last_accessed_at          timestamptz
```
RLS : accès en lecture par le service role uniquement. Toutes les requêtes passent par les routes API serveur.

### 2. Stripe

Produit "WWII Left Bank Self-Guided Tour" avec deux prix (900 et 1400 cents EUR). Je le crée dans le dashboard en mode test, tu me diras quelles env vars renseigner :
- `STRIPE_PRICE_ID_SELF_GUIDED_EARLYBIRD`
- `STRIPE_PRICE_ID_SELF_GUIDED_NORMAL`
- `SELF_GUIDED_LAUNCH_DATE` (ISO 8601)

Helper `getActivePriceId()` : early bird si `now() < launchDate + 30 jours`, sinon prix normal.

Route `POST /api/create-checkout-self-guided` : reçoit `{ email, language }`, crée une Checkout Session en mode `payment`, metadata `{ product_slug: 'left-bank-ww2', language }`, `success_url` vers `/self-guided-tour/success?session_id={CHECKOUT_SESSION_ID}` (variante `/fr/` si FR), `cancel_url` vers la page produit.

Extension du webhook existant : sur `checkout.session.completed` en mode `payment` avec `product_slug` en metadata →
1. générer `access_token` (`crypto.randomBytes(24).toString('base64url')`)
2. insérer dans `digital_purchases`, `download_expires_at = now + 30 jours`
3. générer le PDF watermarké
4. envoyer l'email Resend avec le lien d'accès + le PDF en pièce jointe

Idempotence obligatoire : si `stripe_session_id` existe déjà, retourner 200 sans rien refaire. Le branchement doit être strictement additif — les paiements des tours physiques doivent continuer à fonctionner à l'identique.

### 3. Pages

**`/self-guided-tour`** (+ `/fr/self-guided-tour`) — page produit :
- Hero : "Do the tour on your own time" / "Faites le tour à votre rythme"
- Positionnement complémentaire, honnête, pas de survente
- Ce que contient le pack : 9 sections audio (~40 min de narration), carte avec guidage GPS, photos d'archives synchronisées, PDF 38 pages, mode hors ligne
- **Section "Narrated in my own voice"** avec ma photo : c'est le vrai différenciateur, chaque mot est ma voix. Ne l'écris pas de façon publicitaire, dis-le simplement.
- **Extrait audio** : 30 s de l'intro, streamé depuis `preview/left-bank-ww2/{lang}/intro-30s.mp3` sur R2
- **Aperçu PDF** : 3 pages, depuis `preview/left-bank-ww2/{lang}/pdf-preview.pdf`
- Prix avec badge early bird et jours restants si applicable
- Preuve sociale (réutilise les avis déjà sur le site)
- FAQ : comment ça marche, ai-je besoin d'internet (la webapp fonctionne hors ligne après premier chargement), puis-je l'offrir, combien de temps ai-je accès (permanent pour la webapp, 30 jours pour le téléchargement hors ligne), et si je n'ai pas de GPS
- Formulaire email + langue → checkout Stripe

**`/self-guided-tour/success`** (+ FR) : "Paiement reçu, vérifiez votre boîte mail", polling léger sur `/api/self-guided/check-purchase?session_id=…` toutes les 2 s pendant 30 s max, puis CTA direct vers la webapp dès que le webhook a créé la ligne.

**CTA dans `StepCalendarRegular.tsx`** : encart discret en bas de l'étape calendrier — "No date works for you? Get the self-guided version — €X". C'est le principal point de capture des prospects perdus.

### 4. Protection de la webapp

La route `/self-guided-tour/access` existe déjà (chantier B) et est actuellement ouverte. Il faut maintenant :
- exiger un `?token=…` valide
- résoudre le token côté serveur via `/api/self-guided/access?token=…` qui retourne les données d'achat + le manifest avec URLs signées
- page d'erreur claire si token absent/invalide, avec lien vers le support
- mettre à jour `last_accessed_at`
- retirer le garde-fou `SELF_GUIDED_DEV_MODE`

Le token donne un accès **permanent** à la webapp. Seul le téléchargement hors ligne expire à 30 jours.

### 5. Routes API

- `GET /api/self-guided/check-purchase?session_id=…` → `{ ready, access_token? }`
- `GET /api/self-guided/access?token=…` → données d'achat + manifest + URLs signées (existe peut-être déjà du chantier B, à adapter pour vérifier le token)
- `GET /api/self-guided/download-pdf?token=…&lang=en|fr` → PDF watermarké généré à la volée
- `GET /api/self-guided/download-zip?token=…&lang=en|fr` → zip (PDF watermarké + 9 MP3), refuse si `download_expires_at` dépassé, incrémente `download_count`

### 6. PDF watermarké

Avec `pdf-lib` : récupérer le master depuis R2, ajouter en pied de chaque page `Licensed to <email> — parishistorytours.com — Do not redistribute` (gris clair, petite taille, centré), streamer le résultat. Pas de stockage de versions personnalisées.

### 7. Email transactionnel Resend

Template HTML sobre, cohérent avec le style du site, EN + FR.

Sujet EN : "Your WWII Left Bank Self-Guided Tour is ready 🎧"
Sujet FR : "Votre tour autoguidé Rive Gauche est prêt 🎧"

Corps : salutation avec le prénom (extrait de l'email), lien bouton vers la webapp, explication en trois lignes du fonctionnement, checklist avant de partir (ouvrir la page au wifi pour le mode hors ligne, charger le téléphone, prendre des écouteurs, commencer au 60 Bd Saint-Michel), contact support en bas.

Pièce jointe : le PDF watermarké.

Support : `hello@parishistorytours.com`. Si l'adresse n'est pas configurée côté Resend/DNS, note-le moi.

### 8. SEO

Meta title + description EN/FR pour la page produit. Ajout au sitemap. Mention de l'offre dans `public/llms.txt`. Schema.org `Product` avec prix, disponibilité et `AggregateRating` repris du rating global.

La page `/self-guided-tour/access` reste en `noindex`.

## Contraintes

- Stripe en **mode test** pour tout le développement. Je bascule en live moi-même via les env vars quand je suis prêt.
- Chaque commit doit builder (`pnpm build`).
- Zéro régression sur le tunnel de réservation et les paiements existants.
- Branche `feature/self-guided-commerce`, merge vers `main` seulement après un test de bout en bout.

## Workflow

1. **Discovery** : lis le webhook, la route checkout existante, le pattern Resend, `StepCalendarRegular.tsx`, la structure i18n, et ce qui a été construit au chantier webapp. Confirme-moi où brancher chaque chose.
2. **Plan de commits** (10–15), que je valide. Pause obligatoire après la migration Supabase et après le webhook — je veux tester chaque brique.
3. **Test de bout en bout** : achat en mode test Stripe, vérification de l'email, de la webapp accessible par token, du téléchargement PDF et zip.
4. **Passage en live** : je bascule les env vars, on surveille les premières ventes.

Commence par la discovery.
```

---

## Après les 3 chantiers — checklist de lancement

- [ ] Marcher le tour en conditions réelles, ajuster les coordonnées GPS et le rayon de geofence
- [ ] Faire tester par 2–3 personnes qui ne connaissent pas le tour (le vrai test UX)
- [ ] Vérifier le mode hors ligne en coupant les données sur le téléphone
- [ ] Tester sur iOS **et** Android (le comportement audio en arrière-plan diffère)
- [ ] Vérifier les droits d'usage des photos d'archives avant publication (noté dans le handoff Claude Design)
- [ ] Basculer Stripe en live, faire un achat réel à 1 € pour valider, rembourser
- [ ] Définir `SELF_GUIDED_LAUNCH_DATE` pour démarrer la fenêtre early bird
- [ ] Annoncer sur Instagram, et ajouter le CTA sur la homepage
- [ ] Analytics : étape atteinte, audio terminé, CTA avis cliqué

## Ce qui viendra ensuite

- Version FR de la narration si elle n'est pas produite au chantier A
- Tour Right Bank (même infra, nouveau `product_slug`)
- Bundle Left + Right à 22 €
- Nourritour, Rouen, Copenhague — la webapp est générique, seuls les assets et la config de parcours changent
