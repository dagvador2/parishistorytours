# Client & revenue tracking — Excel → Supabase

The Excel workbook **`Paris_History_Tours_Suivi.xlsx`** is the source of truth
for every client, walk and euro. This pipeline loads it into Supabase, where the
website reads the four figures published on `/key-figures`.

```
Paris_History_Tours_Suivi.xlsx        Supabase                        the site
  Sessions      ──┐                     tour_sessions      ──┐
  Reservations  ──┼─ pnpm tracking:import ─ tour_reservations ─┼─ public_tour_stats     ─ /key-figures
  Contacts      ──┘                     tour_contacts      ──┘  public_tour_countries
  Dashboard     ── cross-check only
```

## Refreshing the figures

1. Edit the workbook as usual (only the `Sessions`, `Reservations` and
   `Contacts` sheets are read — `Dashboard` and `Params` stay Excel-side).
2. Save it, then:

```bash
pnpm tracking:import --dry-run   # parse, validate, print the figures. Writes nothing.
pnpm tracking:import             # same, then make Supabase match the workbook
```

The workbook is looked up, in order, at `data/Paris_History_Tours_Suivi.xlsx`,
`~/Desktop/Paris History Tours/…` and `~/Desktop/…`. Override with
`--file <path>` or `PHT_WORKBOOK=<path>` in `.env`.

Needs `PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

The import is a full replace: rows are inserted, updated, and **deleted when
they disappear from the workbook**. Running it twice changes nothing the second
time. Never edit these tables in the Supabase dashboard — the next import would
undo it.

## What stops an import

It refuses to write anything when:

- a `booking_id`, `session_id` or `contact_id` is duplicated or empty;
- a reservation points at a session or a contact that does not exist;
- a country label cannot be resolved — add it to `src/lib/countries.ts`,
  otherwise those participants would silently vanish from the published count;
- the figures it computes disagree with the ones Excel cached in its own
  `Dashboard` sheet (participants, tours, km, gross and net revenue).

`--force` turns all of that into warnings. Only use it when you know why.

## Schema

| table | one row per | notes |
|---|---|---|
| `tour_sessions` | a walk | `pax`, `ca_brut`, `ca_net` are **not** stored — the database sums them from the reservations, so the two can never disagree |
| `tour_reservations` | a booking | the date comes from the session; `net` is the workbook's own computation, imported as-is |
| `tour_contacts` | a phone-book entry | `pays` and `nb_reservations` are derived, so they are not stored |

`pays` keeps the raw label ("USA", "Ecosse"); `pays_code` holds the ISO alpha-2
resolved at import time from `src/lib/countries.ts`. Scotland and Northern
Ireland collapse onto `GB`, which is why the site says 52 countries where the
workbook's naive distinct-count says 54.

### Privacy

The three tables hold names, phone numbers, e-mail addresses and revenue. RLS is
on with **no policy** and the grants are revoked: the anon key cannot read them,
only the service role can. The site reads two aggregate views instead —
`public_tour_stats` (four counts + the date range) and `public_tour_countries`
(participants per country code). `tour_revenue_by_channel` and
`tour_revenue_by_year` mirror the workbook's revenue block and stay private.

`/api/participants-data` serves those same aggregates. It used to return every
row, names included.

## Files

```
scripts/tracking/
  import-workbook.ts      the command
  lib/xlsx.ts             dependency-free .xlsx reader (ZIP + SpreadsheetML)
  lib/workbook.ts         sheets → database model, validation, cross-check
  lib/*.test.ts           pnpm tracking:test
src/lib/countries.ts      country catalogue shared with the site (code, ISO numeric, fr/en)
src/lib/tour-stats.ts     what /key-figures and /api/participants-data read
src/data/site.ts          KEY_FIGURES_FALLBACK — served only if Supabase is down
supabase/migrations/20260912130000_tour_tracking_workbook.sql
```

After an import that moves the numbers, the command prints a warning if
`KEY_FIGURES_FALLBACK` has drifted — update it and redeploy.
