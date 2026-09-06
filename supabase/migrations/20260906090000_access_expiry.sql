-- The access link is time-limited (a few days after purchase), not permanent,
-- and there is no offline download package any more: the web app caches itself.
-- `download_expires_at` becomes the expiry of the access itself.

alter table public.digital_purchases rename column download_expires_at to access_expires_at;
alter table public.digital_purchases drop column if exists download_count;
