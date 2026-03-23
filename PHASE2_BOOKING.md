# Phase 2 — Refonte du parcours de réservation

> **Objectif** : Simplifier le tunnel de conversion de 6 étapes à 3, séparer clairement les parcours regular/private, et préparer l'architecture pour la synchro manuelle des disponibilités avec les OTAs.
>
> **Règle fondamentale** : Le booking doit fonctionner à l'identique côté paiement (Stripe) et côté data (Supabase) après chaque tâche. Tester le flow complet (sélection → paiement → confirmation) après chaque changement.

---

## Contexte business — Disponibilités & OTAs

### Le problème
Clément vend ses tours sur 3+ canaux :
- **Son site** (parishistorytours.com) → réservation directe via Supabase + Stripe
- **GetYourGuide** → bookings via leur plateforme
- **Viator** → bookings via leur plateforme
- **(bientôt)** TripAdvisor Experiences

Chaque booking sur un canal doit réduire la disponibilité sur tous les autres. Sans outil de centralisation (Bókun = 49$/mois — prématuré au volume actuel), la synchro est manuelle.

### La stratégie retenue : Supabase reste la source de vérité

**Principe** : Supabase est le système central de disponibilités. Quand un booking arrive d'un OTA, Clément le saisit manuellement dans un dashboard admin simple → ça met à jour les `available_spots` dans Supabase → le site reflète instantanément la dispo réelle.

**Architecture :**
```
┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Site direct     │────▶│              │     │  GetYourGuide    │
│  (Stripe+Supa)  │     │   Supabase   │◀────│  (saisie manuelle│
│                  │     │  (sessions)  │     │   via admin)     │
└─────────────────┘     │              │     └──────────────────┘
                        │  Source de   │
┌─────────────────┐     │   vérité     │     ┌──────────────────┐
│  Admin dashboard │────▶│              │◀────│  Viator          │
│  (nouveau)       │     └──────────────┘     │  (saisie manuelle│
└─────────────────┘                           │   via admin)     │
                                              └──────────────────┘
```

**Quand passer à Bókun** : Quand le volume de bookings OTA rend la saisie manuelle pénible (>10 bookings/semaine environ). À ce moment, Bókun remplace le dashboard admin et se connecte nativement à GYG/Viator via leurs APIs.

---

## Parcours de réservation actuel (6 étapes)

```
Étape 1: Choisir le tour (Left Bank / Right Bank)
Étape 2: Nombre de participants (1-4 + select 5+)
Étape 3: Type de tour (Regular / Private)
Étape 4: Calendrier (Regular) OU date/heure libre (Private)
Étape 5: Coordonnées (nom, email, téléphone)
Étape 6: Résumé + paiement (Stripe) ou confirmation (Private)
```

**Problèmes :**
- Trop d'étapes avant de voir les disponibilités — le visiteur ne sait pas s'il y a des places avant l'étape 4
- L'étape "type de tour" est un choix froid sans contexte de prix
- Le wizard est enfoui en bas de la homepage, pas sur les pages de tour

---

## Parcours cible (3 étapes)

### Parcours A — Tour régulier (avec paiement)

```
Étape 1: Tour + Participants + Type
   - Sélection du tour (pré-rempli si on vient d'une page tour)
   - Nombre de participants (1-10)
   - Choix Regular / Private (avec indication de prix)
   → Si Regular : passe à l'étape 2A
   → Si Private : passe à l'étape 2B

Étape 2A: Date & créneau
   - Calendrier avec jours disponibles (données Supabase)
   - Créneaux horaires du jour sélectionné
   - Prix total affiché en temps réel
   → Passe à l'étape 3

Étape 2B: Date & heure souhaitées (Private)
   - Date picker libre (pas de contrainte de dispo)
   - Sélection d'heure (9h-18h par tranches de 30min)
   - Message optionnel
   → Passe à l'étape 3

Étape 3: Coordonnées + Résumé + Action
   - Nom, email, téléphone (optionnel)
   - Résumé de la réservation
   - Choix du mode de paiement (Regular uniquement) :
     • "Payer en ligne" → Stripe Checkout (pré-sélectionné)
     • "Payer sur place" → Réservation confirmée, paiement le jour J
   - Bouton "Payer maintenant" (Regular online → Stripe Checkout)
   - Bouton "Réserver" (Regular on-site → Supabase + email)
   - Bouton "Envoyer la demande" (Private → email + Supabase)
```

### Pourquoi 3 étapes et pas moins
- Étape 1 = contexte (quoi, combien, quel type)
- Étape 2 = disponibilité (quand)
- Étape 3 = action (qui + payer)

On ne peut pas merger davantage sans surcharger l'écran mobile.

---

## Tâches — Ordre d'exécution

### Tâche 1 : Refondre le BookingWizard de 6 à 3 étapes

**Fichiers à modifier :**
```
src/components/BookTour/BookingWizard.tsx    → 3 steps au lieu de 6
src/components/BookTour/BookingContext.tsx    → inchangé (le state suffit)
src/components/BookTour/types.ts             → ajouter champ 'message' pour private
src/components/BookTour/components/ProgressIndicator.tsx → 3 points au lieu de 6
```

**Fichiers à créer :**
```
src/components/BookTour/steps/Step1TourSetup.tsx     → fusionne StepTourSelection + StepParticipants + StepTourType
src/components/BookTour/steps/Step2DateRegular.tsx    → calendrier Supabase (via API route)
src/components/BookTour/steps/Step2DatePrivate.tsx    → date/heure libre
src/components/BookTour/steps/Step3Checkout.tsx       → contact + résumé + action
```

**Fichiers à supprimer (après migration) :**
```
src/components/BookTour/steps/StepTourSelection.tsx
src/components/BookTour/steps/StepParticipants.tsx
src/components/BookTour/steps/StepTourType.tsx
src/components/BookTour/steps/StepCalendarRegular.tsx
src/components/BookTour/steps/StepDateTimePrivate.tsx
src/components/BookTour/steps/StepContact.tsx
src/components/BookTour/steps/StepSummary.tsx
```

**Détail de Step1TourSetup.tsx :**

Layout en une seule vue :

```
┌─────────────────────────────────────────────┐
│  Choisissez votre tour                      │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ 📍 Left Bank │  │ 📍 Right Bank│         │
│  │  2h · 4 stops│  │  2h · 4 stops│         │
│  └──────────────┘  └──────────────┘         │
│                                             │
│  Participants        [  -  ]  2  [  +  ]    │
│                                             │
│  Type de tour                               │
│  ┌────────────────────┐ ┌─────────────────┐ │
│  │ 🎫 Regular         │ │ 🔒 Private      │ │
│  │ €XX/pers · groupe  │ │ Sur devis       │ │
│  │ max 10             │ │ date flexible   │ │
│  └────────────────────┘ └─────────────────┘ │
│                                             │
│              [ Suivant → ]                  │
└─────────────────────────────────────────────┘
```

- Le tour est pré-sélectionné si l'URL contient un paramètre `?tour=left-bank` (passage depuis les pages de tour)
- Le compteur de participants utilise des boutons +/- au lieu de boutons 1/2/3/4 + select (plus intuitif, supporte 1-10)
- Le type Regular affiche le prix par personne (fetch depuis `/api/stripe-price`)
- Le type Private indique clairement "date flexible, tarif sur demande"

**Détail de Step2DateRegular.tsx :**

Même principe que l'actuel `StepCalendarRegular.tsx` mais :
- Utilise les API routes créées en Phase 1 (`/api/sessions?tour=...&participants=...`) au lieu d'importer Supabase directement
- Affiche le prix total en gros sous les créneaux
- Met en avant les créneaux avec beaucoup de places ("5+ spots" en vert)

**Détail de Step2DatePrivate.tsx :**

- Calendrier libre (react-day-picker) sans contrainte de dispo Supabase
- Seule restriction : pas de date dans le passé, pas plus de 3 mois dans le futur
- Sélection d'heure via un select (9:00, 9:30, 10:00, ... 18:00)
- Champ texte optionnel "Message ou demande particulière"

**Détail de Step3Checkout.tsx :**

Fusionne StepContact + StepSummary en un seul écran :

```
┌─────────────────────────────────────────────┐
│  Vos coordonnées                            │
│  Nom      [___________________________]     │
│  Email    [___________________________]     │
│  Tél.     [___________________________]     │
│                                             │
│  ─────────────────────────────────────────  │
│  Récapitulatif                              │
│  Tour:         Left Bank WWII Tour          │
│  Date:         Samedi 15 mars 2026          │
│  Heure:        10:00                        │
│  Participants: 2 personnes                  │
│  Total:        €90                          │
│                                             │
│  Comment souhaitez-vous régler ?            │
│  ┌────────────────────┐ ┌────────────────┐  │
│  │ 💳 Payer en ligne  │ │ 🤝 Payer sur   │  │
│  │ Paiement sécurisé  │ │    place       │  │
│  │ via Stripe         │ │ Le jour du tour │  │
│  └────────────────────┘ └────────────────┘  │
│                                             │
│  [ ← Modifier ]     [ Confirmer → ]        │
│                                             │
│  (pour Private, pas de choix de paiement :) │
│  [ ← Modifier ]  [ Envoyer la demande → ]  │
└─────────────────────────────────────────────┘
```

**Logique des 3 modes de confirmation :**

1. **Regular + Payer en ligne** : `/api/create-checkout-session` → redirect Stripe → webhook → `finalizeBooking()` → email auto (client + admin)
2. **Regular + Payer sur place** : `/api/bookings/pay-on-site` (nouveau) → réserve les places dans Supabase → `/api/send-booking-email` (email client avec mention "paiement sur place" + email admin avec alerte "PAIEMENT SUR PLACE")
3. **Private** : `/api/bookings/private` → Supabase → `/api/send-booking-email` (email client + admin)

**Nouvelle API route nécessaire : `/api/bookings/pay-on-site.ts`**

```typescript
// POST /api/bookings/pay-on-site
// Réserve les places sans paiement Stripe
// Body: { sessionId, participants, name, email, phone?, tour, date, time, price }
export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();

  // 1. Vérifier la session et les places disponibles
  const { data: session } = await supabase
    .from('sessions')
    .select('available_spots')
    .eq('id', data.sessionId)
    .single();

  if (!session || session.available_spots < data.participants) {
    return new Response(JSON.stringify({ error: 'Not enough spots' }), { status: 400 });
  }

  // 2. Décrémenter les places
  await supabase
    .from('sessions')
    .update({ available_spots: session.available_spots - data.participants })
    .eq('id', data.sessionId);

  // 3. Créer le booking avec status 'confirmed' et payment_method 'on_site'
  const { data: booking } = await supabase
    .from('bookings')
    .insert({
      session_id: data.sessionId,
      customer_name: data.name,
      customer_email: data.email,
      participants_count: data.participants,
      total_price: data.price,
      stripe_payment_intent_id: null,
      tour_type: data.tour,
      booking_date: data.date,
      booking_time: data.time,
      status: 'confirmed',
      payment_method: 'on_site',  // ← nouvelle colonne
      source: 'direct',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  // 4. Envoyer les emails (client + admin)
  // L'email API existante gère déjà les deux envois
  // On ajoute un flag paymentMethod pour adapter le contenu de l'email

  return new Response(JSON.stringify({ success: true, bookingId: booking.id }), { status: 200 });
};
```

**⚠️ Migration Supabase supplémentaire nécessaire :**
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';
-- Valeurs possibles : 'stripe', 'on_site', null (pour private)
```

**Adaptation de l'email (`send-booking-email.ts`) :**
- Ajouter un champ `paymentMethod` dans le body de la requête
- Si `paymentMethod === 'on_site'` :
  - Email client : mentionner "Paiement prévu sur place le jour du tour — Merci de prévoir le montant exact en espèces ou par carte."
  - Email admin : afficher un bandeau orange "⚠️ PAIEMENT SUR PLACE" au lieu du vert "PAYMENT CONFIRMED"
- Si `paymentMethod === 'stripe'` ou absent : comportement actuel inchangé

**Boutons dans l'UI :**
- Les deux options (en ligne / sur place) sont des boutons radio ou des cards sélectionnables
- Par défaut, "Payer en ligne" est pré-sélectionné (encourage le paiement en amont)
- Le bouton d'action change de label selon le choix :
  - "Payer en ligne" sélectionné → bouton "Payer maintenant — €90"
  - "Payer sur place" sélectionné → bouton "Réserver — €90 à régler sur place"

- Le formulaire de contact utilise la validation HTML5 native (required, type=email)
- Le bouton "Modifier" ramène à l'étape 1 (pas seulement au contact)

**Logique du wizard :**
```typescript
// BookingWizard.tsx simplifié
const renderStep = () => {
  switch (step) {
    case 1:
      return <Step1TourSetup onNext={next} />;
    case 2:
      return booking.tourType === 'regular'
        ? <Step2DateRegular onNext={next} onBack={back} />
        : <Step2DatePrivate onNext={next} onBack={back} />;
    case 3:
      return <Step3Checkout onBack={back} onRestart={() => setStep(1)} />;
  }
};
```

**Critères de validation :**
- Le flow Regular complet fonctionne : sélection → date → paiement Stripe → page success
- Le flow Private complet fonctionne : sélection → date libre → envoi demande → confirmation
- Le prix est correct (fetch Stripe en temps réel)
- Les disponibilités sont correctes (fetch API sessions)
- Le wizard est responsive (testé 375px, 768px, 1440px)
- Les traductions EN/FR fonctionnent

**Commit** : `feat: refactor booking wizard from 6 steps to 3`

---

### Tâche 2 : Ajouter le paramètre tour dans l'URL

**Objectif** : Quand un visiteur clique "Book" depuis une page de tour, le tour est pré-sélectionné.

**Modifications :**

1. **Pages de tour (`[tour].astro`)** : Le bouton "Book Tour" dans la nav et dans la page pointe vers `/#book-tour?tour=left-bank` ou `/#book-tour?tour=right-bank`.

2. **BookingWizard.tsx** : Au montage, lire `window.location.search` :
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tourParam = params.get('tour');
  if (tourParam && ['left-bank', 'right-bank'].includes(tourParam)) {
    setBooking(prev => ({ ...prev, tour: tourParam }));
  }
}, []);
```

3. **Step1TourSetup.tsx** : Si le tour est déjà sélectionné via URL, le mettre en surbrillance mais permettre de changer.

**Commit** : `feat: pre-select tour from URL parameter`

---

### Tâche 3 : Intégrer le booking sur les pages de tour

**Objectif** : Le visiteur peut réserver directement depuis `/tours/left-bank` sans retourner à la homepage.

**Modifications :**

1. **`src/pages/tours/[tour].astro`** : Ajouter la section `<BookTour />` en bas de page (avant la FAQ), comme c'est déjà le cas sur la homepage.

2. **Le composant `BookTour.astro`** accepte un prop optionnel `defaultTour` :
```astro
---
interface Props {
  defaultTour?: 'left-bank' | 'right-bank';
}
const { defaultTour } = Astro.props;
---
<div id="book-tour" class="mb-16">
  <BookingWizard 
    client:load 
    translations={bookingT} 
    lang={lang} 
    defaultTour={defaultTour} 
  />
</div>
```

3. **Dans `[tour].astro`** :
```astro
<BookTour defaultTour={tour.slug} />
```

4. **BookingWizard.tsx** : Accepter le prop `defaultTour` et l'utiliser comme valeur initiale dans le context.

**Commit** : `feat: add booking section to tour pages with pre-selected tour`

---

### Tâche 4 : Améliorer le CTA sticky

**Objectif** : Le bouton "Book Tour" dans la nav sticky doit être plus visible et plus direct.

**Modifications dans `Navbar.astro`** :

1. **Desktop** : Le bouton "Book Tour" est plus gros, avec une couleur d'accent (pas juste blanc sur gris).

2. **Mobile** : Le bouton "Book Tour" sticky en bas de l'écran (pas en haut) — c'est plus accessible au pouce :
```astro
<!-- CTA mobile fixe en bas -->
<div id="book-cta-mobile" class="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-[9998] shadow-lg p-3 transform translate-y-full transition-transform duration-300">
  <button id="book-btn-mobile" class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg text-lg">
    {bookLabel}
  </button>
</div>
```

3. **Sur les pages de tour** : Le CTA mobile affiche le prix : "Book from €45/person"

**Commit** : `feat: improve sticky CTA with bottom mobile bar and pricing`

---

### Tâche 5 : Créer le dashboard admin basique

**Objectif** : Permettre à Clément de saisir les bookings OTA pour synchroniser les disponibilités.

**Nouveau fichier** : `src/pages/admin/index.astro`

**Fonctionnalités :**
- Page protégée par un mot de passe simple (variable d'environnement `ADMIN_PASSWORD`, vérification via cookie de session)
- Vue calendrier des sessions à venir avec places restantes
- Bouton "Ajouter un booking OTA" qui ouvre un formulaire :
  - Source (GetYourGuide / Viator / TripAdvisor / Autre)
  - Tour (Left Bank / Right Bank)
  - Date + heure (sélection parmi les sessions existantes)
  - Nombre de participants
  - Nom du client (optionnel)
  - Référence OTA (optionnel)
- La soumission appelle une nouvelle API route `/api/admin/add-ota-booking` qui :
  - Insère un record dans `bookings` avec `source: 'gyg'` / `'viator'` etc.
  - Décrémente `available_spots` dans la session correspondante

**Nouveau fichier** : `src/pages/api/admin/add-ota-booking.ts`

```typescript
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Vérifier auth admin via cookie
  const adminToken = cookies.get('admin_token')?.value;
  if (adminToken !== import.meta.env.ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { sessionId, participants, source, customerName, otaReference, tour } = await request.json();

  // 1. Vérifier la session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('available_spots')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session || session.available_spots < participants) {
    return new Response(JSON.stringify({ error: 'Not enough spots' }), { status: 400 });
  }

  // 2. Décrémenter les places
  await supabase
    .from('sessions')
    .update({ available_spots: session.available_spots - participants })
    .eq('id', sessionId);

  // 3. Enregistrer le booking OTA
  await supabase
    .from('bookings')
    .insert({
      session_id: sessionId,
      customer_name: customerName || `OTA ${source}`,
      customer_email: null,
      participants_count: participants,
      total_price: null,
      stripe_payment_intent_id: null,
      tour_type: tour,
      booking_date: null, // sera déduit de la session
      booking_time: null,
      status: 'confirmed',
      source: source, // 'gyg', 'viator', 'tripadvisor', 'direct', 'other'
      ota_reference: otaReference || null,
      created_at: new Date().toISOString()
    });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
```

**⚠️ NOTE** : Il faudra ajouter les colonnes `source`, `ota_reference` et `payment_method` à la table `bookings` dans Supabase. Clément devra exécuter :
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ota_reference TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';
-- payment_method : 'stripe' | 'on_site' | null (pour private/OTA)
```

**Design du dashboard** : Page simple, pas besoin de React — un formulaire Astro avec des `<select>` pour les sessions. Le calendrier affiche les 30 prochains jours. Style minimaliste, Tailwind.

**Exclure du sitemap et de l'indexation** :
- Ajouter `<meta name="robots" content="noindex, nofollow" />` dans le layout admin
- Ajouter `/admin` au filtre du sitemap dans `astro.config.mjs`
- Ajouter `Disallow: /admin` dans `robots.txt`

**Commit** : `feat: add admin dashboard for OTA booking sync`

---

### Tâche 6 : Créer les sessions automatiquement

**Problème actuel** : Les sessions dans Supabase doivent être créées manuellement. Clément doit aller dans Supabase pour ajouter chaque créneau.

**Solution** : Un script/API qui génère les sessions pour les N prochaines semaines selon un planning type.

**Nouveau fichier** : `src/pages/api/admin/generate-sessions.ts`

```typescript
// POST /api/admin/generate-sessions
// Body: { weeksAhead: 4, schedule: { dayOfWeek: [0-6], times: ["10:00", "14:00"], tour: "left-bank", maxSpots: 10 } }

export const POST: APIRoute = async ({ request, cookies }) => {
  // Auth admin
  // Pour chaque semaine à venir :
  //   Pour chaque jour du schedule :
  //     Pour chaque heure :
  //       Si la session n'existe pas déjà → créer dans Supabase
  //       { tour_type, start_time, max_spots, available_spots: max_spots }
};
```

**Intégration dans le dashboard admin** :
- Section "Générer les sessions" avec :
  - Sélection des jours de la semaine (checkboxes)
  - Heures de départ (multi-select)
  - Tour (Left Bank / Right Bank / les deux)
  - Nombre de semaines à l'avance
  - Places max par session
- Bouton "Générer" qui prévisualise les sessions avant de les créer
- Affichage du nombre de sessions qui seront créées

**Commit** : `feat: add session generation tool in admin dashboard`

---

### Tâche 7 : Nettoyer et finaliser

**Actions :**

1. **Supprimer les anciens fichiers de steps** après vérification que tout fonctionne :
```
src/components/BookTour/steps/StepTourSelection.tsx    → supprimer
src/components/BookTour/steps/StepParticipants.tsx      → supprimer
src/components/BookTour/steps/StepTourType.tsx          → supprimer
src/components/BookTour/steps/StepCalendarRegular.tsx   → supprimer
src/components/BookTour/steps/StepDateTimePrivate.tsx   → supprimer
src/components/BookTour/steps/StepContact.tsx           → supprimer
src/components/BookTour/steps/StepSummary.tsx           → supprimer
src/components/BookTour/components/StepWrapper.tsx      → supprimer si plus utilisé
```

2. **Mettre à jour les traductions** dans `en.ts` et `fr.ts` :
- Ajouter les nouvelles clés pour les 3 étapes
- Supprimer les clés orphelines des anciennes étapes (step1-step6, validation messages, etc.)

3. **Vérifier la cohérence** :
- Le flow Regular complet marche EN + FR
- Le flow Private complet marche EN + FR
- Le booking depuis la homepage marche
- Le booking depuis une page de tour marche (avec pré-sélection)
- Le dashboard admin permet d'ajouter un booking OTA
- Les disponibilités se mettent à jour en temps réel après un booking OTA

4. **Vérifier le build** : `pnpm build` passe sans erreur ni warning.

**Commit** : `chore: remove old booking steps and clean up translations`

---

## Validation finale Phase 2

```bash
# 1. Build
pnpm build

# 2. Flow Regular + paiement en ligne
# → Aller sur /tours/left-bank
# → Cliquer Book Tour
# → Vérifier que le tour est pré-sélectionné
# → Sélectionner 2 participants, Regular
# → Choisir une date avec dispo
# → Sélectionner un créneau
# → Remplir nom + email
# → Sélectionner "Payer en ligne"
# → Vérifier le résumé (prix correct)
# → Cliquer Payer → vérifier redirect Stripe
# → Après paiement : vérifier email client + email admin reçus

# 3. Flow Regular + paiement sur place
# → Même parcours, mais sélectionner "Payer sur place"
# → Cliquer Réserver
# → Vérifier : confirmation affichée, email client mentionne "paiement sur place"
# → Vérifier : email admin avec alerte "PAIEMENT SUR PLACE"
# → Vérifier : les places disponibles ont diminué dans Supabase

# 4. Flow Private complet
# → Aller sur /#book-tour
# → Sélectionner Right Bank, 4 participants, Private
# → Choisir une date libre + heure
# → Remplir coordonnées
# → Cliquer Envoyer → vérifier confirmation + emails reçus

# 4. Dashboard admin
# → Aller sur /admin
# → Se connecter
# → Vérifier la vue calendrier
# → Ajouter un booking OTA fictif
# → Vérifier que les places disponibles ont diminué
# → Retourner sur le booking public et vérifier que la dispo est à jour

# 5. Responsive
# → Tester le wizard complet sur mobile (375px)
# → Vérifier le CTA sticky en bas d'écran
# → Vérifier que le calendrier est utilisable au doigt

# 6. SEO
# → /admin ne doit PAS apparaître dans le sitemap
# → Les pages de tour doivent toujours avoir leur JSON-LD
# → Les URLs existantes ne changent pas
```

---

## Ordre d'exécution recommandé pour Claude Code

```
Tâche 1 → Refondre le wizard 6→3 (le plus gros, faire en premier)
Tâche 2 → Paramètre tour dans l'URL
Tâche 3 → Booking sur les pages de tour
Tâche 4 → CTA sticky amélioré
Tâche 5 → Dashboard admin OTA
Tâche 6 → Génération automatique de sessions
Tâche 7 → Nettoyage final
```

Chaque tâche = un commit atomique. Tester le build après chaque commit.

---

## Rappels importants

- **NE PAS** toucher aux API routes Stripe existantes (`create-checkout-session.ts`, `stripe-webhook.ts`, `stripe-price.ts`) — elles fonctionnent
- **NE PAS** modifier le schema Supabase directement — noter les ALTER TABLE nécessaires dans un commentaire pour que Clément les exécute
- **UTILISER** les API routes créées en Phase 1 (`/api/sessions`, `/api/bookings/private`) au lieu d'importer Supabase dans les composants React
- **GARDER** `react-day-picker` pour le calendrier — c'est déjà installé et ça marche
- **TESTER** les deux langues (EN + FR) pour chaque étape du wizard

## Flux d'emails — Récapitulatif

Chaque réservation déclenche **2 emails** (client + admin Clément) via `send-booking-email.ts` + Resend :

| Scénario | Déclencheur email | Contenu client | Contenu admin |
|---|---|---|---|
| Regular + Stripe | Webhook Stripe (`checkout.session.completed`) → `finalizeBooking()` → `sendConfirmationEmail()` | Confirmation + détails + "Payé" | "PAID" bandeau vert |
| Regular + Sur place | `/api/bookings/pay-on-site` → `/api/send-booking-email` | Confirmation + détails + "Paiement sur place le jour du tour" | "⚠️ PAIEMENT SUR PLACE" bandeau orange |
| Private | `/api/bookings/private` → `/api/send-booking-email` | Demande reçue + "Nous vous recontactons sous 24h" | "Action required" bandeau jaune |

L'API `send-booking-email.ts` doit être modifiée pour accepter un champ `paymentMethod` (`'stripe'` | `'on_site'` | `null`) et adapter le contenu de l'email en conséquence.
