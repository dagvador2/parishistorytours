# Phase 2b — Refonte du parcours de réservation (session-first)

> **Objectif** : Le visiteur ne choisit plus le tour pour les sessions régulières. Il voit directement le calendrier des sessions planifiées par Clément. Le choix du tour n'apparaît que pour les tours privés.
>
> **État actuel** : Le wizard est à 3 étapes (Step1TourSetup → Step2DateRegular/Step2DatePrivate → Step3Checkout). Les API routes existent (`/api/sessions`, `/api/sessions/[date]`, `/api/bookings/pay-on-site`, `/api/bookings/private`). Le dashboard admin existe (`/admin`). Le paiement sur place et Stripe fonctionnent. Les anciens fichiers (StepTourSelection, StepParticipants, StepTourType, etc.) sont encore dans le dossier mais ne sont plus importés par le wizard.

---

## Ce qui change

### Avant (actuel)
```
Étape 1: Choisir tour (Left Bank / Right Bank) + participants + type (Regular / Private)
Étape 2: Calendrier filtré par tour choisi (Regular) OU date libre (Private)
Étape 3: Coordonnées + paiement
```

### Après (cible)
```
Écran d'accueil: "Join a scheduled tour" OU "Book a private tour"

Chemin Regular (2 étapes):
  Étape 1: Calendrier de TOUTES les sessions planifiées (tous tours confondus)
           → Le visiteur voit quel tour est prévu chaque jour
           → Il sélectionne un créneau
           → Il choisit son nombre de participants
  Étape 2: Coordonnées + paiement (Stripe ou sur place)

Chemin Private (2 étapes):
  Étape 1: Choix du tour + participants + date/heure libre + message
  Étape 2: Coordonnées + confirmation
```

---

## Architecture des composants — cible

### Fichiers à créer
```
src/components/BookTour/steps/
├── ModeSelector.tsx         # Écran d'accueil : "Join a tour" / "Private tour"
├── RegularCalendar.tsx      # Calendrier toutes sessions + sélection créneau + participants
├── RegularCheckout.tsx      # Contact + paiement (récupère la logique de Step3Checkout pour regular)
├── PrivateSetup.tsx         # Choix tour + participants + date libre + message
└── PrivateCheckout.tsx      # Contact + confirmation (récupère la logique de Step3Checkout pour private)
```

### Fichiers à modifier
```
src/components/BookTour/BookingWizard.tsx   # Nouveau flow avec mode selector
src/components/BookTour/types.ts           # Ajouter tour: "both" pour private
src/data/tour-info.ts                      # Nouveau — config statique des tours (nom, stops)
```

### Fichiers à supprimer (après migration)
```
src/components/BookTour/steps/Step1TourSetup.tsx
src/components/BookTour/steps/Step2DateRegular.tsx
src/components/BookTour/steps/Step2DatePrivate.tsx
src/components/BookTour/steps/Step3Checkout.tsx
src/components/BookTour/steps/StepTourSelection.tsx    # ancien, déjà non-importé
src/components/BookTour/steps/StepParticipants.tsx      # ancien
src/components/BookTour/steps/StepTourType.tsx           # ancien
src/components/BookTour/steps/StepCalendarRegular.tsx    # ancien
src/components/BookTour/steps/StepDateTimePrivate.tsx    # ancien
src/components/BookTour/steps/StepContact.tsx            # ancien
src/components/BookTour/steps/StepSummary.tsx             # ancien
```

### API routes — aucun changement nécessaire
Les API routes existantes fonctionnent déjà :
- `/api/sessions?tour=...&participants=...` → **MODIFIER** : rendre le paramètre `tour` optionnel (retourne toutes les sessions si pas de tour spécifié)
- `/api/sessions/[date]?tour=...&participants=...` → **MODIFIER** : idem, tour optionnel
- `/api/bookings/pay-on-site` → inchangé
- `/api/bookings/private` → inchangé
- `/api/create-checkout-session` → inchangé
- `/api/stripe-price` → inchangé

---

## Tâches — Ordre d'exécution

### Tâche 1 : Modifier les API sessions pour supporter "tous les tours"

**Modifier `src/pages/api/sessions.ts`** : si le paramètre `tour` est absent, retourner les sessions de TOUS les tours.

```typescript
// GET /api/sessions?participants=2           → toutes les sessions
// GET /api/sessions?tour=left-bank&participants=2  → sessions left-bank uniquement
export const GET: APIRoute = async ({ url }) => {
  const tour = url.searchParams.get('tour'); // optionnel maintenant
  const participants = parseInt(url.searchParams.get('participants') || '1');

  let query = supabase
    .from('sessions')
    .select('id, start_time, available_spots, max_spots, tour_type')
    .gte('start_time', new Date().toISOString())
    .gte('available_spots', participants)
    .order('start_time', { ascending: true });

  if (tour) {
    query = query.eq('tour_type', tour);
  }

  const { data, error } = await query;
  // ... reste identique, grouper par date
};
```

**Faire pareil pour `src/pages/api/sessions/[date].ts`** — rendre `tour` optionnel.

**Important** : chaque session retournée doit inclure `tour_type` pour que le frontend sache quel tour est prévu.

**Commit** : `feat: make tour parameter optional in sessions API`

---

### Tâche 2 : Créer tour-info.ts — données statiques des tours

**Créer `src/data/tour-info.ts`** :
```typescript
export interface TourInfo {
  slug: string;
  nameEN: string;
  nameFR: string;
  stopsEN: string;
  stopsFR: string;
}

export const tourInfo: Record<string, TourInfo> = {
  'left-bank': {
    slug: 'left-bank',
    nameEN: 'Left Bank WWII Tour',
    nameFR: 'Visite Rive Gauche',
    stopsEN: 'Panthéon · Sorbonne · Notre-Dame',
    stopsFR: 'Panthéon · Sorbonne · Notre-Dame',
  },
  'right-bank': {
    slug: 'right-bank',
    nameEN: 'Right Bank WWII Tour',
    nameFR: 'Visite Rive Droite',
    stopsEN: 'Pont Alexandre III · Concorde · Vendôme',
    stopsFR: 'Pont Alexandre III · Concorde · Vendôme',
  },
};
```

Ce fichier est utilisé par `RegularCalendar` pour afficher le nom du tour et les stops dans chaque créneau, sans faire de requête supplémentaire.

**Commit** : `feat: add static tour info data file`

---

### Tâche 3 : Créer ModeSelector.tsx

**L'écran d'accueil du booking.** Deux cards cliquables.

```
┌──────────────────────────────────────────────────┐
│          Book your tour                          │
│                                                  │
│   ┌─────────────────────┐ ┌────────────────────┐ │
│   │                     │ │                    │ │
│   │  📅 Join a          │ │  🔒 Book a         │ │
│   │  scheduled tour     │ │  private tour      │ │
│   │                     │ │                    │ │
│   │  See upcoming       │ │  Choose your tour, │ │
│   │  dates & book       │ │  date & group      │ │
│   │  your spot.         │ │  size.             │ │
│   │  Small group,       │ │  Exclusive         │ │
│   │  max 10 people.     │ │  experience.       │ │
│   │                     │ │                    │ │
│   │  From €45/person    │ │  Custom pricing    │ │
│   │                     │ │                    │ │
│   └─────────────────────┘ └────────────────────┘ │
└──────────────────────────────────────────────────┘
```

- Le prix "From €45/person" est fetch depuis `/api/stripe-price`
- Les deux cards sont des boutons qui appellent `onSelectRegular()` ou `onSelectPrivate()`
- Style cohérent avec le design actuel (rounded-xl, shadow-lg, border-2, etc.)
- Sur mobile : cards empilées verticalement

**Commit** : `feat: create ModeSelector booking entry screen`

---

### Tâche 4 : Créer RegularCalendar.tsx — le cœur du nouveau système

**C'est le composant le plus important.**

**Fonctionnement :**

1. Au montage, fetch `/api/sessions?participants=1` (pas de filtre tour)
2. Afficher un calendrier (`react-day-picker`) avec les jours qui ont des sessions
3. Quand le visiteur clique un jour, afficher les créneaux en dessous

**Affichage des créneaux — chaque créneau est une card qui affiche :**

```
┌───────────────────────────────────────────────┐
│  🕐 10:30 AM                                  │
│  Left Bank WWII Tour                          │
│  Panthéon · Sorbonne · Notre-Dame             │
│  6 spots remaining · €45/person                │
│                                  [ Select → ]  │
└───────────────────────────────────────────────┘
```

- L'heure en gros et gras
- Le nom du tour (récupéré depuis `tour-info.ts` via le `tour_type` de la session)
- Les stops principaux en une ligne grise (donne le contexte sans avoir besoin d'une photo)
- Places restantes (en vert si >5, en orange si ≤3) + prix/personne
- Bouton Select ou toute la card cliquable

**Quand le visiteur sélectionne un créneau :**
- Le créneau est highlight (border-blue, check mark)
- Un compteur de participants apparaît en dessous du créneau sélectionné (ou dans une section fixe en bas) :

```
┌───────────────────────────────────────────────┐
│  ✅ Session selected                          │
│  Sat, March 28 · 10:30 AM                    │
│  Left Bank WWII Tour                          │
│                                               │
│  Participants    [ - ]  2  [ + ]              │
│  Total           €90 (2 × €45)               │
└───────────────────────────────────────────────┘
```

- Le nombre de participants est demandé ICI (après le choix de créneau), pas avant. Ça permet de vérifier immédiatement qu'il y a assez de places.
- Si le visiteur met plus de participants que de places dispos, afficher un message d'erreur inline

**Le bouton "Suivant" est actif uniquement quand un créneau ET un nombre de participants sont sélectionnés.**

**Props que ce composant doit passer au contexte :**
- `booking.tour` ← déduit du `tour_type` de la session sélectionnée (pas choisi par l'utilisateur)
- `booking.sessionId`
- `booking.date`
- `booking.time`
- `booking.participants`
- `booking.price`
- `booking.tourType` = 'regular'

**Commit** : `feat: create RegularCalendar with session-first approach`

---

### Tâche 5 : Créer RegularCheckout.tsx

**Reprend la logique de l'actuel Step3Checkout.tsx pour le chemin Regular uniquement.**

Affiche :
- Récapitulatif (tour, date, heure, participants, prix) — le nom du tour vient de `tour-info.ts`
- Formulaire contact (nom, email, téléphone)
- Choix paiement (Stripe / sur place)
- Bouton action

**La logique de paiement est identique à l'actuel Step3Checkout** — copier les handlers `handleSubmit` pour les cas `regular + stripe` et `regular + on_site`.

**Après booking réussi** : écran de confirmation (comme l'actuel).

**Commit** : `feat: create RegularCheckout for scheduled tour booking`

---

### Tâche 6 : Créer PrivateSetup.tsx + PrivateCheckout.tsx

**PrivateSetup.tsx** — le visiteur configure son tour privé :
- Choix du tour : Left Bank / Right Bank / Both (3 options, "Both" = nouveau)
- Nombre de participants (+/-)
- Date souhaitée (react-day-picker, calendrier libre, pas de contrainte Supabase)
- Heure souhaitée (select : 9:00, 9:30, ..., 18:00)
- Message optionnel (textarea)

**PrivateCheckout.tsx** — coordonnées + récapitulatif + envoi :
- Formulaire contact (nom, email, téléphone)
- Récapitulatif de la demande
- Bouton "Send request"
- Appel `/api/bookings/private` + `/api/send-booking-email`
- Écran de confirmation "Request sent! We'll contact you within 24h"

**Pour le type "Both"** : adapter `types.ts` → `export type Tour = "left-bank" | "right-bank" | "both";`
Et adapter `/api/bookings/private` pour accepter `tour: "both"`.

**Commit** : `feat: create private tour booking flow with tour selection`

---

### Tâche 7 : Refondre BookingWizard.tsx

**Réécrire le wizard pour utiliser les nouveaux composants :**

```typescript
const Wizard: React.FC = () => {
  const [mode, setMode] = useState<'choose' | 'regular' | 'private'>('choose');
  const [step, setStep] = useState(1);

  if (mode === 'choose') {
    return (
      <ModeSelector
        onSelectRegular={() => { setMode('regular'); setStep(1); }}
        onSelectPrivate={() => { setMode('private'); setStep(1); }}
      />
    );
  }

  if (mode === 'regular') {
    switch (step) {
      case 1:
        return <RegularCalendar onNext={() => setStep(2)} onBack={() => setMode('choose')} />;
      case 2:
        return <RegularCheckout onBack={() => setStep(1)} onRestart={() => { setMode('choose'); setStep(1); }} />;
    }
  }

  if (mode === 'private') {
    switch (step) {
      case 1:
        return <PrivateSetup onNext={() => setStep(2)} onBack={() => setMode('choose')} />;
      case 2:
        return <PrivateCheckout onBack={() => setStep(1)} onRestart={() => { setMode('choose'); setStep(1); }} />;
    }
  }
};
```

**Le ProgressIndicator** : adapter pour afficher 2 points au lieu de 3, ou le supprimer (le flow est assez court pour ne pas en avoir besoin). Le ModeSelector n'a pas de progress indicator.

**Le prop `defaultTour`** : n'est plus pertinent pour le chemin regular (le tour est déduit de la session). Pour le chemin private, on peut le garder pour pré-sélectionner le tour si le visiteur vient d'une page tour.

**Commit** : `feat: refactor BookingWizard with mode selector and two paths`

---

### Tâche 8 : Nettoyer les anciens fichiers

**Supprimer tous les anciens composants de steps :**
```bash
rm src/components/BookTour/steps/Step1TourSetup.tsx
rm src/components/BookTour/steps/Step2DateRegular.tsx
rm src/components/BookTour/steps/Step2DatePrivate.tsx
rm src/components/BookTour/steps/Step3Checkout.tsx
rm src/components/BookTour/steps/StepTourSelection.tsx
rm src/components/BookTour/steps/StepParticipants.tsx
rm src/components/BookTour/steps/StepTourType.tsx
rm src/components/BookTour/steps/StepCalendarRegular.tsx
rm src/components/BookTour/steps/StepDateTimePrivate.tsx
rm src/components/BookTour/steps/StepContact.tsx
rm src/components/BookTour/steps/StepSummary.tsx
```

**Vérifier** qu'aucun de ces fichiers n'est importé :
```bash
grep -rn "Step1TourSetup\|Step2Date\|Step3Checkout\|StepTourSelection\|StepParticipants\|StepTourType\|StepCalendarRegular\|StepDateTimePrivate\|StepContact\|StepSummary" src/ --include="*.tsx" --include="*.ts"
```

**Mettre à jour les traductions** dans `en.ts` et `fr.ts` :
- Ajouter les clés pour ModeSelector, RegularCalendar, RegularCheckout, PrivateSetup, PrivateCheckout
- Les clés du tour-info (stops) peuvent être dans les traductions ou dans `tour-info.ts` directement (le fichier gère déjà EN/FR)
- Supprimer les clés orphelines (step1, step2, step3, step1Setup, etc.)

**Commit** : `chore: remove old booking steps and update translations`

---

## Validation finale

```bash
# 1. Build
pnpm build

# 2. Flow Regular complet
# → Section Book Tour → "Join a scheduled tour"
# → Voir le calendrier avec les sessions
# → Cliquer sur un jour → voir les créneaux avec nom du tour + stops
# → Sélectionner un créneau
# → Choisir le nombre de participants
# → Vérifier le prix total
# → Remplir coordonnées
# → Test "Pay online" → redirect Stripe
# → Test "Pay on the day" → confirmation + email

# 3. Flow Private complet
# → "Book a private tour"
# → Choisir Left Bank, 4 participants, date + heure + message
# → Remplir coordonnées
# → Envoyer → confirmation + email

# 4. Depuis une page de tour
# → /tours/left-bank → Book Tour
# → Doit ouvrir le ModeSelector (pas de pré-sélection de tour pour regular)
# → Pour private, le tour peut être pré-sélectionné

# 5. Test les deux langues (EN + FR)

# 6. Aucun import Supabase dans les composants
grep -r "from.*supabase" src/components/ --include="*.tsx"
# Doit retourner 0 résultats

# 7. Aucun ancien fichier importé
grep -rn "Step1TourSetup\|StepTourSelection\|StepParticipants" src/ --include="*.tsx"
# Doit retourner 0 résultats
```

---

## Ordre d'exécution pour Claude Code

```
Tâche 1 → API sessions : tour optionnel
Tâche 2 → tour-info.ts : données statiques
Tâche 3 → ModeSelector : écran d'accueil
Tâche 4 → RegularCalendar : calendrier session-first (le plus complexe)
Tâche 5 → RegularCheckout : paiement
Tâche 6 → PrivateSetup + PrivateCheckout
Tâche 7 → BookingWizard : assemblage
Tâche 8 → Nettoyage
```

Chaque tâche = un commit atomique. Tester le build après chaque commit.

---

## Rappels importants

- **AUCUN import de Supabase** dans les composants React — tout passe par `/api/`
- **NE PAS toucher** aux API routes Stripe existantes
- **GARDER** `react-day-picker` pour les calendriers
- **Le BookingWizard reste en React** (`client:load`)
- **Tester EN + FR** pour chaque composant
- **Les stops des tours** viennent de `src/data/tour-info.ts`, pas de Supabase
- **Le tour est déduit de la session** pour le chemin regular — le visiteur ne le choisit pas
- **Le prix vient de `/api/stripe-price`** — le composant le fetch au montage
- **Les migrations Supabase** (source, ota_reference, payment_method) sont déjà en place si Clément les a exécutées. Sinon, les noter en commentaire.
