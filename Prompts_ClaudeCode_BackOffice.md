# Prompt Claude Code — Back-office unifié (réservations + suivi d'activité)

> Une session de **planification**, pas d'implémentation. Copie-colle le bloc entre les
> lignes `━━━` dans une nouvelle conversation Claude Code ouverte sur ce dépôt, en mode
> plan (`/plan` ou « réfléchis avant de coder »). Dépose d'abord le classeur Excel dans
> `data/Paris_History_Tours_Suivi.xlsx` (le dossier `data/` est ignoré par git).
>
> Le livrable attendu de cette session est un **plan en phases**, chacune livrable et
> commitable seule, avec un schéma cible et une stratégie de migration — pas du code.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Je suis Clément, guide indépendant (Paris History Tours, visites WW2 à Paris — Rive Gauche,
Rive Droite, Histoire générale, Nourritour). Je veux repenser mon back-office pour n'avoir
**qu'un seul outil** là où j'en ai deux aujourd'hui. Je te demande un **plan**, pas du code :
lis, pose-moi tes questions, puis propose. On implémentera ensuite, phase par phase, dans
d'autres sessions.

## La situation : deux mondes qui ne se parlent pas

**1. Le site, en temps réel** — tables Supabase `sessions` et `bookings`.
Le wizard de réservation du site écrit dedans (Stripe, paiement sur place, demandes privées),
l'admin `/admin` les lit. C'est opérationnel mais ça ne sait rien de ce qui se passe *après*
la réservation : qui est venu, combien j'ai encaissé, les pourboires, le pays des gens.

**2. Mon classeur Excel** — `data/Paris_History_Tours_Suivi.xlsx`, feuilles *Sessions*,
*Reservations*, *Contacts*, *Dashboard*. C'est ma vérité historique et financière : chaque
visite réalisée, chaque client, son pays, le canal (direct, GetYourGuide, Viator, Airbnb,
Freetour…), le brut, la commission, le net, le pourboire cash, si un avis Google a été laissé.
Je le tiens à la main. `pnpm tracking:import` le déverse dans `tour_sessions`,
`tour_reservations`, `tour_contacts` (migration `supabase/migrations/20260912130000_tour_tracking_workbook.sql`),
et deux vues publiques (`public_tour_stats`, `public_tour_countries`) alimentent la page
« Key figures » du site.

Résultat : une réservation du site, je la ressaisis dans l'Excel après la visite. Une
réservation OTA arrivée par mail, je la saisis deux fois (admin + Excel). Et rien ne me dit,
le soir d'une visite, « voilà ce que ça t'a rapporté ».

## Ce que je veux à la fin

Un back-office unique, dans le site, qui suit **tout le cycle de vie d'une session** :

1. **Planifiée** — je génère mes créneaux (ça existe : `/admin`, avec la langue de la visite).
2. **Remplie** — les réservations arrivent de trois façons :
   - le site (ça existe),
   - les OTA par mail : GetYourGuide, Viator, Airbnb m'envoient une notification à chaque
     réservation. Je veux que ces mails soient **lus automatiquement** (Resend sait recevoir
     du courrier entrant ; un filtre Gmail peut transférer) et transformés en **propositions**
     — « GetYourGuide, 2 pers., samedi 10:30 » — que je valide d'un tap dans l'admin, après
     quoi la réservation existe sur la bonne session,
   - la saisie manuelle (ça existe pour les OTA, à garder).
3. **Réalisée** — après la visite, une **clôture** en 30 secondes sur mon téléphone : qui
   était là (présents / no-show), pourboires, notes, éventuellement une impression sur le
   groupe. C'est ce que je saisis dans l'Excel aujourd'hui.
4. **Suivie** — relance avis Google (le mail J+1 existe déjà), avis laissé ou non, revenus
   nets par canal et par période.

Et un volet **données** : contacts (pays, canal d'origine, consentement marketing),
statistiques (nombre de visites, participants, pays, km — ce que la page Key figures montre),
finances (brut / commissions / net / tips, par canal, par mois, par an).

**L'Excel doit devenir un export, plus une source.** Si je veux un tableau, je l'exporte
depuis l'admin.

## Ce qui existe déjà — à lire avant de proposer

- `src/pages/admin/index.astro` — le dashboard actuel (demandes privées à traiter, sessions
  des 30 prochains jours avec les gens dessus, outils OTA / génération, déclenchement des
  mails). Une page Astro + JS vanilla, styles `is:global`, charte du site.
- `src/pages/api/admin/*` — `overview`, `confirm-private`, `cancel-booking`,
  `add-ota-booking`, `generate-sessions`. Garde `src/lib/admin-auth.ts` (mot de passe en
  cookie) en tête : c'est l'auth actuelle, elle est minimale.
- `src/lib/email.ts` + `src/lib/emails/*` — confirmation, notification admin, rappel J-1,
  merci J+1 ; `src/lib/scheduled-emails.ts` + `src/pages/api/cron/*` (Vercel cron, plan
  Hobby : **une exécution par jour et par cron**, deux crons max).
- `src/lib/booking.ts` — finalisation Stripe, annulation avec remise en vente des places.
- `supabase/migrations/` — tout le schéma. Regarde en particulier `bookings`
  (colonnes ajoutées récemment : `email_locale`, `tour_language`, `customer_phone`,
  `customer_message`, `reminder_sent_at`, `thanks_sent_at`, `confirmed_at`) et le trio
  `tour_*` du classeur.
- `scripts/tracking/` — l'import du classeur et sa validation (`lib/workbook.ts`) : c'est
  la meilleure description des règles métier de l'Excel (calcul du net, statuts, canaux).
- `src/pages/key-figures.astro` et `src/lib/tour-stats.ts` — ce qui consomme les vues
  publiques. **Ça ne doit pas casser.**
- Le classeur lui-même : `data/Paris_History_Tours_Suivi.xlsx`. Ouvre-le, regarde chaque
  feuille, les formules du Dashboard, et les cas bizarres (dates estimées, sessions sans
  réservation, réservations sans contact).

## Contraintes

- Stack : Astro 5 sur Vercel (plan Hobby), React islands possibles, Tailwind 4, Supabase
  (RLS actif, service role côté serveur), Stripe, Resend. Pas de framework d'admin externe.
- Je suis seul. L'outil doit être **utilisable sur un téléphone, sur le trottoir**, entre
  deux visites. La clôture de session surtout.
- Charte du site (ink on paper, Playfair + Inter, rouge `#8a3b2e`) — l'admin actuel la suit.
- Ne pas toucher au wizard de réservation public ni à l'audioguide (`self-guided`).
- Les vues publiques `public_tour_stats` / `public_tour_countries` doivent continuer à
  donner les mêmes chiffres (ou de meilleurs, mais jamais des chiffres cassés).
- Les données historiques du classeur (plusieurs années) doivent être reprises **une fois**,
  proprement, puis le classeur cesse d'être écrit.

## Ce que j'attends de toi dans cette session

1. **Lis** les fichiers ci-dessus et le classeur. Ne propose rien avant.
2. **Pose-moi tes questions** — sur le métier (que veut dire tel statut, tel canal, comment je
   calcule un net Viator vs GetYourGuide), sur les volumes, sur ce que je regarde vraiment
   dans le Dashboard Excel. Groupe-les, je réponds en une fois.
3. **Propose un modèle de données cible** : fusion ou non de `bookings` / `tour_reservations`,
   de `sessions` / `tour_sessions`, place des contacts, où vivent les montants (brut,
   commission, net, tips), les présences, les notes de clôture. Dis ce que tu gardes, ce que
   tu renommes, ce que tu abandonnes, et pourquoi.
4. **Propose une stratégie de migration** des données historiques : import unique, règles de
   réconciliation (une réservation du site et sa ligne Excel sont-elles la même chose ?),
   vérification des totaux avant/après, et ce qu'on fait du script d'import ensuite.
5. **Découpe en phases**, chacune livrable et commitable seule, avec ce qu'elle apporte à
   l'usage dès qu'elle est en ligne. Ordre suggéré à challenger :
   - a. schéma unifié + reprise de l'historique + vues publiques rebranchées,
   - b. clôture de session (présents, tips, notes) depuis l'admin, mobile,
   - c. boîte d'entrée OTA (mails → propositions → validation),
   - d. finances et statistiques dans l'admin, export Excel/CSV,
   - e. contacts / consentement / relance avis.
6. **Liste les risques** et les points où tu hésites. Sur l'auth notamment : le mot de passe
   en cookie suffit-il pour un outil qui contiendra toutes mes données clients et financières,
   ou passe-t-on à Supabase Auth ?
7. Termine par un **document de plan** (fichier markdown dans le dépôt, `PHASE7_BACKOFFICE.md`,
   dans la lignée des `PHASE*.md` existants) que je pourrai donner tel quel aux sessions
   d'implémentation.

Ne code rien dans cette session. Si tu es tenté de « juste corriger un petit truc », note-le
dans le plan à la place.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Après la session de plan

Chaque phase du `PHASE7_BACKOFFICE.md` deviendra une session d'implémentation. Donne-lui le
fichier de plan et la lettre de la phase ; rien d'autre n'est nécessaire.
