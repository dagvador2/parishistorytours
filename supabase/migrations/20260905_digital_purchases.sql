-- Self-guided tour (digital product) purchases — chantier C.
-- Apply in the Supabase SQL editor (or `supabase db push`). Read/write only
-- through the service role from the server: RLS enabled, no policy for anon.

create table if not exists public.digital_purchases (
  id                        uuid primary key default gen_random_uuid(),
  email                     text not null,
  product_slug              text not null default 'left-bank-ww2',
  stripe_session_id         text unique not null,
  stripe_payment_intent_id  text,
  access_token              text unique not null,
  language                  text not null check (language in ('en', 'fr')),
  amount_paid_cents         integer not null,
  currency                  text not null default 'eur',
  purchased_at              timestamptz not null default now(),
  download_expires_at       timestamptz not null,
  download_count            integer not null default 0,
  last_accessed_at          timestamptz
);

create index if not exists digital_purchases_email_idx on public.digital_purchases (email);
create index if not exists digital_purchases_access_token_idx on public.digital_purchases (access_token);

alter table public.digital_purchases enable row level security;
-- No policies on purpose: the anon key can neither read nor write. The service
-- role bypasses RLS and is the only client used by the API routes.

revoke all on public.digital_purchases from anon, authenticated;
