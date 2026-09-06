# Phase 6 — Pipeline audio : visite Seconde Guerre mondiale en voix clonée

> **Objectif** : Générer l'audio d'une visite guidée audio premium (Seconde Guerre mondiale, vendue directement sur ce site — pas via l'app Flutter du projet `ai-audio-guide`), narrée avec la voix clonée de Clément sur Fish Audio, avec sous-titres synchronisés mot à mot (karaoké). Le point dur à résoudre : les années et dates doivent être prononcées correctement.
>
> **Portée de cette phase** : uniquement le pipeline de génération audio (texte → MP3 + timestamps). La page produit, le paiement et le lecteur audio front-end sont des phases suivantes.
>
> **Ce document est une spec technique, pas du code prêt à copier tel quel** : les extraits ci-dessous viennent du pipeline TTS déjà en production sur `ai-audio-guide` (repo séparé, pas un monorepo — rien n'est partagé automatiquement) et doivent être portés/adaptés dans ce projet.

---

## Contexte : ceci est un script one-shot, pas un endpoint

La visite a un script fixe (quelques arrêts, un texte que Clément valide une fois). Il n'y a donc **aucune raison de générer l'audio à la volée à chaque visiteur** — c'est le même choix que fait `ai-audio-guide` pour ses visites du catalogue (génération hors-ligne, servi ensuite à coût nul). Le travail de cette phase est un **script Node exécuté localement** (`tsx scripts/generate-audio-tour.ts` ou équivalent), pas une route API Astro. Le résultat (fichiers MP3 + JSON de timestamps) est généré une fois, puis commité ou uploadé, et servi statiquement.

Régénérer un arrêt = relancer le script sur ce texte modifié. Voir Tâche 7 (cache) pour ne pas tout regénérer à chaque fois.

---

## Architecture existante (référence)

- **Clé API** : `FISH_AUDIO_API_KEY` est déjà présente dans `.env` de ce projet (confirmé, une vraie valeur y est déjà collée).
- **Voix clonée existante** : sur le compte Fish Audio utilisé par `ai-audio-guide`, un `reference_id` de voix clonée existe déjà : `c1daa68c20e24ec9a918effa663093e8`, validé à l'écoute le 22/08/2026 (`ai-audio-guide/src/config/voices.ts`). **À vérifier en premier** : si la clé API collée ici correspond au même compte Fish Audio, ce `reference_id` est réutilisable directement, sans re-cloner la voix. Sinon, il faut recréer le clone sur ce compte (Clément a déjà les 15 prises "Nuancier vocal" enregistrées pour ça).
- **Repo de référence pour le code** : `~/ai-audio-guide` — pipeline TTS Fish Audio + normalisation FR + karaoké déjà en prod, fichiers clés :
  - `src/modules/tts/fishAudioTts.ts` — appel API Fish Audio
  - `src/modules/tts/ttsTextNormalizer.ts` — normalisation du texte avant TTS (années, siècles, heures, titres…) **— c'est la réponse au problème des dates**
  - `src/modules/tts/concatenator.ts` — concaténation des morceaux audio
  - `src/modules/storage/hashing.ts` — pattern de hash pour le cache
- **Stack de ce projet** : Astro en mode `server` sur Vercel, `@supabase/supabase-js` déjà en dépendance (client + service role key déjà configurés dans `.env`) — pertinent pour l'hébergement du résultat (Tâche 8).

---

## Tâche 1 : Le problème des années/dates — cause et correctif

**Constat déjà fait sur `ai-audio-guide`, à l'écoute réelle (22/08/2026)** : si on envoie un nombre en chiffres nus au TTS ("1944"), le modèle l'expanse lui-même, avec parfois une pause bizarre entre les groupes ("mille neuf cent... quarante-quatre"). Pire : si le texte source écrit les nombres avec des tirets partout ("vingt-cinq-mille-sept-cents"), le modèle voit un unique bloc qu'il n'a jamais vu à l'entraînement, le débite mécaniquement et **perd la liaison** — `vingt-cinq` est sorti en `vin cinq` lors d'un test réel.

**Correctif validé** : écrire le nombre entièrement en toutes lettres AVANT l'appel TTS, avec les groupes séparés par des **espaces**, et des tirets **seulement** là où l'orthographe française l'impose à l'intérieur d'un groupe de moins de 100 (`vingt-cinq`, jamais entre les groupes de mille/cent) :

```
1944  → "mille neuf cent quarante-quatre"
1789  → "mille sept cent quatre-vingt-neuf"
271300 → "deux cent soixante et onze mille trois cents"
```

Ce n'est **pas une astuce ponctuelle** : `ai-audio-guide/src/modules/tts/ttsTextNormalizer.ts` implémente déjà ce correctif de façon générale et testée (`tests/ttsTextNormalizer.test.ts`), avec en plus :

- les **plages d'années** (`1788-1789`, `1914-18`) → `"mille sept cent quatre-vingt-huit à mille sept cent quatre-vingt-neuf"` (sinon le tiret est lu comme un signe moins)
- les **siècles / ordinaux romains** (`XXe siècle` → `"vingtième siècle"`)
- les **souverains** (`Louis XIV` → `"Louis quatorze"`)
- les **heures** (`18h30` → `"dix-huit heures trente"`)
- les **titres abrégés** (`M.`, `Mme`, `Dr`…)

**Recommandation : ne pas réécrire cette logique from scratch.** Copier `ttsTextNormalizer.ts` tel quel dans ce projet (il est autonome — sa seule dépendance externe est un type `WordTimestamp` trivial à inliner), puis supprimer ce qui ne sert à rien pour un script de visite WW2 (probablement peu de souverains/papes, mais les dates et les heures serviront à coup sûr). Copier aussi son fichier de test.

---

## Tâche 2 : Dictionnaire de prononciation spécifique WW2

`ttsTextNormalizer.ts` a aussi un dictionnaire `PRONUNCIATION_FIXES` pour les mots que Fish Audio prononce mal, découverts à l'écoute au fil du temps (ex. `rhinocéros` → `rhinocérosse` car le "s" final ne sort pas seul ; `Schœlcher` → `Chelcher`). C'est un **pattern à reproduire pour le vocabulaire propre à cette visite**, pas une liste à copier — les mots utiles ici seront différents (nom de rue, grades militaires allemands, sigles français de la Résistance, noms de lieux). Exemples de candidats probables à vérifier à l'écoute : `Wehrmacht`, `Kommandantur`, `Gestapo`, `Vichy`, `SNCF`, `STO`, `FFI`, `FTP`, tout nom propre allemand ou russe présent dans le script.

**Méthode** : générer d'abord un échantillon court (voir Checklist plus bas), noter chaque mot mal prononcé, l'ajouter au dictionnaire, régénérer, réécouter. Ne pas essayer de deviner à l'avance — c'est un problème qui ne se détecte qu'à l'oreille.

---

## Tâche 3 : Appel Fish Audio TTS

Recette qui tourne déjà en prod sur `ai-audio-guide` (`src/modules/tts/fishAudioTts.ts`), à porter :

```ts
const FISH_AUDIO_API_URL = "https://api.fish.audio/v1/tts";

async function generateChunk(text: string, referenceId: string): Promise<Buffer> {
  const response = await fetch(FISH_AUDIO_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
      "Content-Type": "application/json",
      model: "s2.1-pro-free", // modèle utilisé par ai-audio-guide — à réévaluer si besoin
    },
    body: JSON.stringify({
      text,
      reference_id: referenceId,
      format: "mp3",
      // Échantillonnage resserré : aux réglages par défaut le modèle hallucine
      // (mots inventés, bascules de langue en cours de phrase). Mesuré sur
      // ai-audio-guide par transcription Whisper de 3 tirages du même texte :
      // 5 anomalies au défaut contre 1 avec ces réglages.
      temperature: 0.3,
      top_p: 0.7,
    }),
  });
  if (!response.ok) throw new Error(`Fish Audio API error ${response.status}: ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}
```

**Découpage en morceaux** : Fish Audio encaisse des textes longs, mais si l'alignement Whisper (Tâche 5) tourne sur un Worker Cloudflare, celui-ci convertit l'audio reçu octet par octet — un segment trop long (> ~800 caractères ≈ 45s ≈ 350 Ko) peut le faire tomber. Découper aux frontières de phrase (`. `, `! `, `? `), jamais au milieu d'un mot. Si Whisper tourne via l'API OpenAI (Tâche 5, option recommandée), cette contrainte ne s'applique pas — mais découper par arrêt reste raisonnable pour la reprise sur erreur.

---

## Tâche 4 : Concaténer les morceaux d'un même arrêt

Pas besoin de ffmpeg : `ai-audio-guide` concatène simplement les buffers MP3 bout à bout (`Buffer.concat`), ça fonctionne en prod tant que tous les morceaux sortent de Fish Audio avec le même format constant. Si un arrêt a plusieurs styles de voix (narrateur / citation), insérer un court silence MP3 entre les deux (`concatenator.ts` utilise 500ms) — probablement inutile ici si toute la visite est en une seule voix continue.

Si des clics ou artefacts apparaissent aux jonctions à l'écoute, se rabattre sur un concat ffmpeg (`ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp3`) — mais commencer par le concat brut, c'est ce qui marche déjà ailleurs.

---

## Tâche 5 : Timestamps mots pour le karaoké

Fish Audio ne renvoie **aucun timestamp** — juste l'audio brut. Il faut un passage d'alignement séparé après coup. Deux options :

### Option recommandée pour ce projet : OpenAI Whisper API

Ce site est sur Vercel, sans infra Cloudflare existante — ajouter Workers + R2 juste pour cette fonctionnalité est un vendor de plus à gérer pour un usage ponctuel. L'API Whisper d'OpenAI donne les timestamps mot par mot en un seul appel, coût négligeable pour un usage one-shot (quelques dollars pour toute la visite, pas un coût récurrent puisque c'est pré-généré) :

```ts
const form = new FormData();
form.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "stop1.mp3");
form.append("model", "whisper-1");
form.append("response_format", "verbose_json");
form.append("timestamp_granularities[]", "word");

const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: form,
});
const { words } = await res.json(); // [{ word, start, end }, ...] en secondes
```

Nécessite une clé `OPENAI_API_KEY` (à ajouter à `.env` — nouvelle dépendance, mais aucune infra à déployer). Attention à la limite de 25 Mo par requête Whisper — largement suffisant pour un arrêt de quelques minutes en MP3, mais à vérifier si un arrêt est exceptionnellement long.

### Option alternative : porter le Worker Cloudflare de `ai-audio-guide`

`ai-audio-guide/workers/whisper-align` fait la même chose gratuitement via Cloudflare Workers AI (`@cf/openai/whisper`). **Ne pas le réutiliser tel quel** — il a deux dépendances à son infra qui ne conviennent pas ici :

1. Il lit l'audio depuis le bucket R2 `ai-audio-guide` via un **binding** Cloudflare, pas depuis le corps de la requête HTTP. Pour ce projet, il faudrait soit son propre bucket R2, soit modifier le Worker pour accepter les octets audio directement en POST (plus simple pour un usage ponctuel).
2. Le quota gratuit Workers AI est de **10 000 neurones/jour, par compte Cloudflare**. Si ce projet utilise le même compte Cloudflare que `ai-audio-guide`, les deux pipelines se partagent ce quota — risque de faire échouer l'un des deux silencieusement. Un bug déjà rencontré et documenté dans `whisperAlign.ts` : sous quota épuisé, le Worker répond `200 OK` avec des segments **vides**, ce qui ressemble à un problème d'audio mais n'en est pas un. Si cette option est choisie, valider explicitement `words.length > 0` avant d'accepter un résultat, et utiliser un compte Cloudflare séparé si possible.

Sauf préférence forte de Clément pour rester à $0, privilégier l'option OpenAI ci-dessus : plus simple, pas de nouvelle infra, coût trivial pour un one-shot.

---

## Tâche 6 : Recaler les timestamps sur le texte affiché

Point subtil mais important : les timestamps sortent alignés sur le texte **prononcé** ("mille neuf cent quarante-quatre" = 4 mots), pas sur le texte **affiché** à l'écran pour le karaoké ("1944" = 1 mot). Sans réalignement, le sous-titrage karaoké se désynchronise dès le premier nombre ou la première date normalisée.

`ai-audio-guide/src/modules/tts/ttsTextNormalizer.ts` résout déjà ça : `normalizeFrenchTtsText()` retourne, pour chaque token affiché, le nombre de mots prononcés qu'il couvre (`spokenCount`), et `remapTimestampsToDisplay()` réunit les timestamps du provider en conséquence (le token affiché "1944" reçoit le `start` du premier mot prononcé et le `end` du dernier). Les deux fonctions sont autonomes et se portent avec `ttsTextNormalizer.ts` (Tâche 1) sans dépendance supplémentaire.

**Pipeline complet dans l'ordre** :
1. texte affiché → `normalizeFrenchTtsText()` → texte prononcé + tokens
2. texte prononcé → Fish Audio → audio
3. audio → Whisper → timestamps sur le texte prononcé
4. timestamps + tokens → `remapTimestampsToDisplay()` → timestamps sur le texte affiché
5. c'est CE résultat (étape 4) qui sert au karaoké front-end, jamais celui de l'étape 3 directement

---

## Tâche 7 : Cache — ne pas tout regénérer à chaque run

Pattern simple, déjà utilisé sur `ai-audio-guide` (`src/modules/storage/hashing.ts`) : hash du texte normalisé + `reference_id` de la voix + modèle, tronqué à 8-12 caractères hex (`sha256(text + voice + model).slice(0, 10)`). Si le hash d'un arrêt n'a pas changé depuis le dernier run, sauter la génération (audio + Whisper) et réutiliser les fichiers existants. Ça rend le script relançable sans crainte après une correction de prononciation sur un seul arrêt.

---

## Tâche 8 : Où stocker le résultat

Deux options raisonnables pour ce projet (pas besoin de R2/Cloudflare) :

- **`public/audio/wwii-tour/`** — le plus simple. Convient bien si le total reste modeste (une visite de quelques arrêts × quelques minutes en MP3 ≈ 20-40 Mo). Servi directement par Vercel, aucune config supplémentaire.
- **Supabase Storage** — déjà un client configuré dans ce projet (`src/lib/supabase.ts`, service role key déjà en `.env`). Préférable si l'audio doit pouvoir être mis à jour sans redéployer le site, ou si le volume grossit (plusieurs visites audio à terme).

Dans les deux cas, ranger le MP3 final et son JSON de timestamps côte à côte (même nom de base), et committer/uploader les deux ensemble.

---

## Checklist de validation avant la génération complète

Même logique que la validation de la voix clonée elle-même (les 15 prises "Nuancier vocal") : écouter un petit échantillon avant de tout lancer.

1. Générer 2-3 arrêts seulement (pas toute la visite).
2. Écouter en particulier :
   - toutes les années/dates du script
   - les noms propres allemands, sigles, grades militaires
   - les noms de lieux parisiens moins courants
3. Étendre le dictionnaire de prononciation (Tâche 2) pour chaque mot mal dit.
4. Régénérer ces mêmes arrêts, réécouter, répéter jusqu'à ce que ce soit propre.
5. Vérifier que le karaoké recalé (Tâche 6) tombe juste sur au moins un arrêt contenant une date, en comparant visuellement le texte affiché et l'audio.
6. Seulement après ça, lancer la génération complète des arrêts restants.

---

## Décisions à trancher par Clément avant de lancer Claude Code sur cette tâche

Ce sont des choix que je ne peux pas faire à sa place :

1. **Compte Fish Audio** : réutiliser le même compte/clé que `ai-audio-guide` (le `reference_id` de voix clonée est alors réutilisable tel quel) — ou compte séparé pour ce site commercial (facturation isolée, mais re-clonage de la voix nécessaire avec les 15 prises déjà enregistrées).
2. **Whisper** : API OpenAI (recommandé — simple, coût trivial, zéro nouvelle infra) ou Worker Cloudflare (gratuit mais nouvelle infra à déployer, et risque de quota partagé si même compte Cloudflare que `ai-audio-guide`).
3. **Hébergement de l'audio final** : `public/` (simple) ou Supabase Storage (déjà configuré, plus flexible pour des mises à jour futures).

---

## Ordre d'exécution recommandé

```
1. Vérifier si le compte Fish Audio est le même que ai-audio-guide (décision 1)
2. Copier ttsTextNormalizer.ts + son test depuis ai-audio-guide, trimmer le superflu
3. Construire le dictionnaire de prononciation WW2 (vide au départ, rempli à l'écoute)
4. Écrire le script Node : normalize → Fish TTS → concat → Whisper → remap → sauver
5. Générer 2-3 arrêts, valider via la Checklist ci-dessus
6. Étendre le dictionnaire, itérer jusqu'à validation
7. Générer tous les arrêts restants
8. Vérifier le cache (relancer le script sans rien changer → doit tout sauter)
```

---

## Prompt Claude Code

Voici le prompt à donner à Claude Code pour implémenter cette spec :

```
Lis le fichier PHASE6_AUDIO_TOUR_VOIX_CLONEE.md à la racine du projet. Il contient la
spec complète du pipeline de génération audio pour la visite Seconde Guerre mondiale
en voix clonée (Fish Audio), avec karaoké synchronisé.

Écris un script Node autonome (scripts/generate-audio-tour.ts, exécuté via tsx en
local, PAS une route API Astro — c'est une génération ponctuelle hors-ligne) qui,
pour chaque arrêt du script de la visite :
1. normalise le texte français avant TTS (années, dates, heures en toutes lettres —
   voir Tâche 1 et 2 de la spec, en portant ttsTextNormalizer.ts depuis
   ~/ai-audio-guide/src/modules/tts/ttsTextNormalizer.ts)
2. appelle Fish Audio TTS (voir Tâche 3, reference_id et clé déjà dans .env — vérifier
   d'abord la décision 1 de la spec avec Clément si le reference_id existant est
   réutilisable)
3. concatène les morceaux audio d'un même arrêt (Tâche 4)
4. génère les timestamps mot par mot via Whisper (Tâche 5 — utiliser l'option OpenAI
   API recommandée sauf indication contraire de Clément)
5. recale les timestamps du texte prononcé sur le texte affiché (Tâche 6, port de
   remapTimestampsToDisplay())
6. sauve le MP3 final + le JSON de timestamps, avec un cache par hash pour ne pas
   regénérer un arrêt inchangé (Tâche 7)

Le texte des arrêts n'existe pas encore dans ce repo — demande-moi où le récupérer
(fichier, ou je le colle directement) avant de commencer à écrire le script.

Suis la Checklist de validation de la spec avant de lancer la génération complète :
génère d'abord 2-3 arrêts, je vais les écouter et te remonter les mots mal prononcés
à ajouter au dictionnaire de prononciation, puis on itère avant de tout générer.

Ne touche à aucun autre fichier du site (pages, booking, Stripe) — cette phase est
strictement le pipeline audio.
```

---

## Rappels importants

- **Ceci n'est pas une route API** — c'est un script local, exécuté à la demande, pas un endpoint qui tourne à chaque visite.
- **Le texte du script de la visite n'existe pas encore dans ce repo** — il faudra le fournir à Claude Code au moment de l'implémentation.
- **Ne pas sauter la Checklist d'écoute** — les mauvaises prononciations (dates, noms propres) ne se détectent qu'à l'oreille, jamais en relisant le code.
- **Ce document ne couvre pas** la page produit, le paiement, ni le lecteur audio front-end avec sous-titres karaoké — phases suivantes.
