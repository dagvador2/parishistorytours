-- The buyer picks the day they plan to walk the tour. The explanatory sheet is
-- sent straight away, but the app opens on that date and stays open for the
-- access window, so buying weeks ahead no longer burns the window.
-- Existing rows: access starts at purchase, as before.

alter table public.digital_purchases
  add column if not exists access_starts_at timestamptz;

update public.digital_purchases set access_starts_at = purchased_at where access_starts_at is null;

alter table public.digital_purchases
  alter column access_starts_at set not null,
  alter column access_starts_at set default now();
