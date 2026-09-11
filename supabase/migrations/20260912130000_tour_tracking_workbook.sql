-- Client / revenue tracking, fed by the Excel workbook
-- (`Paris_History_Tours_Suivi.xlsx`, sheets Sessions / Reservations / Contacts).
--
-- The workbook is the source of truth; `pnpm tracking:import` replaces the
-- content of these three tables on every run. Nothing writes to them from the
-- website.
--
-- The old `data_participants_tour` table (372 rows, tips-only Freetour era)
-- is kept as a read-only backup under a `_legacy` name and is no longer read
-- by any page.
--
-- Privacy: the raw tables hold names, phone numbers, e-mail addresses and
-- revenue. They are locked (RLS on, no policy, grants revoked) and reachable
-- only through the service role. The site reads the two aggregate views at the
-- bottom, which expose counts and nothing else.

-- Guarded so the migration also applies to an environment that never had the
-- old table (a fresh branch database, say).
do $$
begin
  if to_regclass('public.data_participants_tour') is not null then
    alter table public.data_participants_tour rename to data_participants_tour_legacy;
  end if;
  if to_regclass('public.data_participants_tour_legacy') is not null then
    comment on table public.data_participants_tour_legacy is
      'Frozen backup of the pre-workbook participant list. Superseded by tour_reservations; kept for reference only.';
    revoke all on public.data_participants_tour_legacy from anon, authenticated;
  end if;
end $$;

-- --------------------------------------------------------------- contacts --

create table if not exists public.tour_contacts (
  contact_id              text primary key,
  prenom                  text,
  libelle_repertoire      text,
  telephone               text,
  telephone_2             text,
  email                   text,
  canal_origine           text,
  date_repertoire         date,
  consentement_marketing  boolean not null default false,
  date_consentement       date,
  fiabilite_rattachement  text,
  notes                   text,
  updated_at              timestamptz not null default now()
);

comment on table public.tour_contacts is 'Phone-book contacts (Contacts sheet). Country and booking count are derived, not stored.';

-- --------------------------------------------------------------- sessions --

create table if not exists public.tour_sessions (
  session_id    integer primary key,
  date          date,
  date_estimee  boolean not null default false,
  tour          text,
  langue        text,
  statut        text not null,
  km            numeric(6,2) not null default 0,
  notes         text,
  updated_at    timestamptz not null default now()
);

comment on table public.tour_sessions is 'One walk (Sessions sheet). pax / ca_brut / ca_net are derived from tour_reservations, so they are not stored.';
comment on column public.tour_sessions.date_estimee is 'The date was reconstructed rather than recorded at the time.';

create index if not exists tour_sessions_date_idx on public.tour_sessions (date);

-- ----------------------------------------------------------- reservations --

create table if not exists public.tour_reservations (
  booking_id           text primary key,
  session_id           integer references public.tour_sessions (session_id) on delete restrict,
  contact_id           text references public.tour_contacts (contact_id) on delete set null,
  nom_client           text,
  pax                  integer not null default 0 check (pax >= 0),
  pays                 text,
  pays_code            text check (pays_code ~ '^[A-Z]{2}$'),
  etat_us              text,
  canal                text,
  apporteur            text,
  modele               text,
  montant_brut         numeric(10,2) not null default 0,
  pourboire_cash       numeric(10,2) not null default 0,
  commission_pct       numeric(6,4) not null default 0,
  frais_pers           numeric(10,2) not null default 0,
  net                  numeric(10,2) not null default 0,
  statut               text not null,
  avis_laisse          boolean not null default false,
  date_relance_google  date,
  avis_texte           text,
  notes                text,
  updated_at           timestamptz not null default now()
);

comment on table public.tour_reservations is 'One booking (Reservations sheet). The date comes from the session; `net` is the workbook''s own computation, imported as-is.';
comment on column public.tour_reservations.pays is 'Raw label as typed in the workbook.';
comment on column public.tour_reservations.pays_code is 'ISO 3166-1 alpha-2 resolved at import time (src/lib/countries.ts). UK nations collapse onto GB.';

create index if not exists tour_reservations_session_idx on public.tour_reservations (session_id);
create index if not exists tour_reservations_contact_idx on public.tour_reservations (contact_id);
create index if not exists tour_reservations_statut_idx on public.tour_reservations (statut);

-- ------------------------------------------------------------------- RLS --

alter table public.tour_contacts      enable row level security;
alter table public.tour_sessions      enable row level security;
alter table public.tour_reservations  enable row level security;

-- No policies on purpose: only the service role (which bypasses RLS) touches
-- these tables. Revoke the schema-level default grants as well.
revoke all on public.tour_contacts, public.tour_sessions, public.tour_reservations
  from anon, authenticated;

-- ------------------------------------------------------- published views --

-- Both views are owned by the migration role and therefore read the base
-- tables with the owner's rights (no `security_invoker`), which is what lets
-- the anon key read aggregates without ever reaching a personal column.

create or replace view public.public_tour_stats as
select
  (select coalesce(sum(r.pax), 0)
     from public.tour_reservations r
    where r.statut = 'Réalisé')::int                                     as participants,
  (select count(*)
     from public.tour_sessions s
    where s.statut = 'Réalisé'
      and s.tour is distinct from 'Produit digital')::int                as tours_conducted,
  (select coalesce(round(sum(s.km)), 0)
     from public.tour_sessions s
    where s.statut = 'Réalisé')::int                                     as kilometers,
  (select count(distinct r.pays_code)
     from public.tour_reservations r
    where r.statut = 'Réalisé'
      and r.pays_code is not null)::int                                  as countries,
  (select min(s.date)
     from public.tour_sessions s
    where s.statut = 'Réalisé')                                          as first_tour_on,
  (select max(s.date)
     from public.tour_sessions s
    where s.statut = 'Réalisé')                                          as last_tour_on;

comment on view public.public_tour_stats is 'The four figures published on /key-figures, plus the date range. Safe for the anon key.';

create or replace view public.public_tour_countries as
select
  r.pays_code                        as code,
  sum(r.pax)::int                    as participants,
  count(*)::int                      as bookings
from public.tour_reservations r
where r.statut = 'Réalisé'
  and r.pays_code is not null
group by r.pays_code
order by 2 desc, 1;

comment on view public.public_tour_countries is 'Participants per country (ISO alpha-2). Safe for the anon key: no personal data.';

grant select on public.public_tour_stats, public.public_tour_countries to anon, authenticated;

-- ---------------------------------------------------- private reporting  --

-- Mirrors the workbook Dashboard's "Par canal" block, which sums every
-- reservation whatever its status, so the totals match. Service role only.
create or replace view public.tour_revenue_by_channel as
select
  r.canal                                                       as canal,
  count(*)::int                                                 as reservations,
  sum(r.pax)::int                                               as pax,
  round(sum(r.montant_brut), 2)                                 as brut,
  round(sum(r.pourboire_cash), 2)                               as pourboires_cash,
  round(sum(r.montant_brut * r.commission_pct), 2)              as commissions,
  round(sum(r.frais_pers * r.pax), 2)                           as frais_fixes,
  round(sum(r.net), 2)                                          as net
from public.tour_reservations r
group by r.canal
order by 8 desc;

-- Completed bookings only, so `pax` is the published participant count split
-- by year (the workbook's own year block mixes the two conventions).
create or replace view public.tour_revenue_by_year as
select
  extract(year from s.date)::int                                as annee,
  count(distinct s.session_id)::int                             as visites,
  sum(r.pax)::int                                               as pax,
  round(sum(r.montant_brut), 2)                                 as brut,
  round(sum(r.net), 2)                                          as net
from public.tour_reservations r
join public.tour_sessions s on s.session_id = r.session_id
where r.statut = 'Réalisé'
group by 1
order by 1;

revoke all on public.tour_revenue_by_channel, public.tour_revenue_by_year from anon, authenticated;
