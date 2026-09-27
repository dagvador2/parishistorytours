-- The language a session is guided in.
--
-- Until now a 10:30 slot was just a 10:30 slot, and every one of them was
-- implicitly in English. A French visitor booking from /fr got a French
-- confirmation for a walk that would be narrated in English, and found out
-- on the pavement. The language is now a fact of the session, set when the
-- schedule is generated, shown on every slot the visitor can pick, and
-- copied onto the booking so the emails can say "guided in English".

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'
  CHECK (language IN ('en', 'fr'));

-- Every session that exists today was, in practice, guided in English.
UPDATE sessions SET language = 'en' WHERE language IS NULL;
