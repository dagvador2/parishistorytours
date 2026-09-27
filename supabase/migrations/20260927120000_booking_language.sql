-- Language on a booking, and the bookkeeping the scheduled emails need.
--
-- Until now the language a customer was written in existed only for the few
-- milliseconds between the request body and the Resend call. Anything sent
-- later — the day-before reminder, the morning-after thank-you — reads the
-- database, hours after the fact, and had no way of knowing whether to write
-- in French or English.
--
-- Two languages are stored, because they are two different things:
--   email_locale  — the language we correspond in, taken from the version of
--                   the site the booking was made on.
--   tour_language — the language the tour is guided in. Null for now; it
--                   starts being filled once sessions carry a language of
--                   their own, and the confirmation prints a "guided in
--                   English" line the moment it is not null.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email_locale TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tour_language TEXT;

-- Send-once marks. A cron that runs twice — a retry, a redeploy, a manual
-- trigger — must not mail the same person twice.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS thanks_sent_at TIMESTAMPTZ;

-- Both scheduled jobs select on the calendar day.
CREATE INDEX IF NOT EXISTS bookings_booking_date_idx ON bookings (booking_date);

-- Existing rows: everything sent before today went out in English, since that
-- was the fallback whenever the locale was anything other than 'fr'.
UPDATE bookings SET email_locale = 'en' WHERE email_locale IS NULL;
