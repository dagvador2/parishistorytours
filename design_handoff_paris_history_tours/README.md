# Handoff: Paris History Tours — Website Redesign

## Overview

This is a visual redesign of **parishistorytours.com** — a Paris walking-tour business run by Clement Barbaza, offering WWII-focused and general-history tours. The redesign addresses the existing site's pain points: inconsistent color palette (orange/blue/gray clash), cheap overall feel, unclear value proposition, and cluttered navigation.

The chosen direction — internally named **Quiet** — is a minimalist, editorial take: black ink on warm off-white, classical serif headings paired with a neutral sans, generous whitespace, thin hairline rules, and a single desaturated rouge accent (#8a3b2e) used sparingly for emphasis. The feeling should be "well-made independent bookshop" or "Cereal magazine" — trustworthy, literate, unhurried.

## About the Design Files

The files in `design/` are **design references created in HTML** — prototypes showing intended look, layout, and behavior. They are **not** production code to copy directly.

The live site is an **Astro** project. Your task is to **recreate these designs in that existing Astro codebase**, using its established component structure, routing, data layer, and conventions. Map each section of the HTML to an existing Astro component where one exists (the user mentioned components like `<Hero>`, `<TourCard>`, booking sections already exist); extract new components only where needed. Lift design tokens into the global style layer. Do **not** ship the HTML verbatim.

If a structural pattern differs between the mock and what makes sense in Astro (e.g. the mock has inline JS the site already handles with a component), prefer the codebase's pattern — this mock is a spec for *appearance and behavior*, not architecture.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, and interactions are decided. Recreate pixel-perfectly, with these caveats:

- The mock uses placeholder images loaded directly from the live site's `/photos/` URLs — replace with the Astro-processed image components (`<Image>` from `astro:assets`) using the existing source files.
- The Mapbox map in the mock is a static SVG fallback. The real site already has Mapbox; keep that integration and only apply the styling shown (teal ink on cream, numbered circular stop markers, 1px stroke polyline route).

## Scope of This Handoff

**In scope:**
- Home page (`design/index.html`) — full redesign
- Tour detail page template (`design/tours/left-bank.html`) — one example

**Out of scope (build from the template):**
- Right Bank tour detail page
- General History tour detail page

The other two tour pages use the **same template** as Left Bank — just different content (title, hero image, facts, themes, stops, gallery, booking links). Duplicate the Astro component, pass different tour data. No design variation needed between them unless structurally required (e.g. General History has 3 stops instead of 4 — grid adapts automatically).

## Screens / Views

### 1. Home page

**Purpose:** First-touch landing. Communicates what the business is, the three tour offerings, credibility (reviews, appearances), and drives to booking.

**Layout** (2560-line HTML — sections in vertical order):

1. **Top bar** — thin horizontal band, 36px tall, `#1a1a1a` background, white text. Left: small notice text ("Tours in English & French · Private groups available"). Right: WhatsApp phone link, EN/FR language toggle. Font: Inter 12px, letter-spacing 0.05em.

2. **Main nav** — sticky, white background, 70px tall, 1px bottom border `rgba(26,26,26,0.1)`. Left: brand lockup (20×20 square outline mark + "Paris History Tours" in Playfair Display 20px/600, tagline "Walking tours · since 2018" in Inter 11px/400 below). Center: nav links (Tours, Route, Compare, About, FAQ) — Inter 14px/500, 28px gap, underline on active. Right: "Book a tour" button — solid `#1a1a1a`, white text, 2px radius, Inter 13px/500.

3. **Hero** — 64px top padding / 96px bottom / 32px horizontal. Two-column grid (`1.2fr 1fr`, 72px gap) with a 1px vertical rule between them at ~46.5%.
   - **Left column:** small uppercase kicker ("The Walk"), then a headline in Playfair Display, `clamp(52px, 6.5vw, 84px)`, weight 500, letter-spacing -0.02em, line-height 1, left-aligned, mixed case. Sample copy: "Paris, on foot, told properly." Below: meta row with 32px gap — three items (duration, distance, group size), each with a small uppercase label and a value in Playfair 18px.
   - **Right column:** preceded by a tiny uppercase label "The Offer". A card-like stack — NOT a card (transparent, no border, no shadow) — containing: short 2-sentence description in Inter 15px/1.6 color `#4a4a4a`; a 1px divider; the three tour titles as a stacked list with title (Playfair 20px) + one-line description (Inter 14px `#4a4a4a`) + chevron on hover; below a 1px divider, a CTA row with primary "Book a tour" and secondary "WhatsApp" text link.

4. **Hero backbone strip** (only visible in Quiet) — below the hero, 64px margin, a thin horizontal strip with three label rows: "Booking", "Credibility", "Logistics" — each with 2–3 facts in small caps Inter 11px.

5. **Tours section** (`#tours`) — 96px vertical padding. Section header: small uppercase kicker "Three Tours", Playfair 48px title "Choose your walk." Below: 3-column grid of tour cards (`1fr 1fr 1fr`, 32px gap, on >900px; stacks on mobile). Each card:
   - Transparent background, 1px top border `rgba(26,26,26,0.1)`, 32px top padding, no bottom border.
   - Small tour index ("01." / "02." / "03.") in Inter 12px `#4a4a4a` letter-spacing 0.15em uppercase.
   - Tour title in Playfair 28px/600 (Left Bank · WW2 / Right Bank · WW2 / General History).
   - 4–5 line description in Inter 15px/1.6 `#4a4a4a`.
   - Meta row: "4 stops · 2.5 km · 2h" in Inter 13px `#4a4a4a` letter-spacing 0.08em.
   - "Explore this tour →" link in Inter 14px/500 black with underline-on-hover.

6. **Route section** (`#route`) — 96px vertical padding, paper-2 background `#f0efea`. Left side: tabbed switcher (Left Bank / Right Bank / General) as horizontal pill row, active pill gets black background + white text. Below tabs: ordered list of stops, each row = circled number (28px, black border, black numeral) + stop title (Playfair 20px) + blurb (Inter 14px `#4a4a4a`) + time marker (Inter 12px mono-feel). Right side: map canvas (Mapbox), approximately 4:3 aspect, desaturated style with teal polyline connecting stops and matching numbered markers.

7. **Compare section** (`#compare`) — 96px vertical padding. A 3-column table-like grid comparing the tours across axes: "Focus", "Route", "Duration", "Stops", "Best for". Row labels in Inter 12px uppercase letter-spacing 0.15em `#4a4a4a`. Cells in Inter 15px `#1a1a1a`. 1px horizontal rules between rows.

8. **Reviews strip** — horizontal scroll-free grid of 4 quotes. Each: short pull-quote in Playfair italic 20px, attribution in Inter 13px `#4a4a4a`, 5-star row in Playfair 16px, source (TripAdvisor / GetYourGuide) as small caps label.

9. **About section** (`#about`) — 96px vertical padding. Two columns: photo of Clement (left, 1.2:1) + long-form text (right). Text stack: kicker "The Guide", Playfair 36px headline "Clement Barbaza.", 3 paragraphs of Inter 16px/1.7 body, then a small meta card listing credentials (history degrees, years guiding, media appearances: France Inter, Le Monde, Condé Nast Traveler).

10. **Booking section** — heading "How to book.", partner logos row (GetYourGuide, Viator, TripAdvisor, Paris je t'aime — grayscale, 28px tall, 40px gap, opacity 0.6), followed by a direct WhatsApp + email chip row.

11. **FAQ section** (`#faq`) — 96px vertical padding. Single-column accordion. Each row: 1px top border, question in Playfair 20px, plus/minus icon right-aligned, answer animates open in Inter 15px/1.7.

12. **Footer** — 64px padding. Three columns (Brand, Navigate, Contact). Brand lockup repeated. Bottom: thin rule + copyright row + partner list.

### 2. Tour detail page (`tours/left-bank.html`)

**Purpose:** Deep-dive into a specific tour. Sells the walk, shows the route, provides booking.

**Layout:**

1. **Same top bar + nav as home.**

2. **Hero** — full-width image (80vh max-height, `object-fit: cover`), with overlay kicker + title + subtitle stacked left-aligned 48px from bottom edge. Kicker: "Left Bank · WWII". Title: Playfair 72px/500 white. Subtitle: Inter 18px rgba(255,255,255,0.8).

3. **"Did You Know" strip** — below hero, paper-2 background, 4–5 short fact cards in a horizontal grid. Each: small number (01/02/...) + one-sentence fact. 1px vertical dividers between.

4. **Themes section** — "Three themes, one walk." headline. 3-column grid: "The Fall · The Resistance · The Liberation" (or per tour). Each theme: Playfair 24px title + 3-line description.

5. **Route & stops** — same Mapbox + numbered-list layout as home, but filtered to this tour only. No tab switcher.

6. **Gallery** — "Then & Now" grid. 6–8 images, 2-column on mobile, 3-column desktop. Each with small Inter 12px caption below.

7. **Booking card** — sticky or inline CTA block. Price, duration, group size, CTA buttons (GetYourGuide primary, WhatsApp secondary).

8. **Partner logos row** (same as home).

9. **FAQ** — filtered to this tour's questions.

10. **Footer** — same as home.

## Design Tokens

Extract these into the global style layer (`src/styles/tokens.css` or equivalent). **Use these exact values.**

### Colors

```css
--ink:        #1a1a1a;   /* primary text, buttons, dark fills */
--ink-2:      #4a4a4a;   /* secondary text, meta labels */
--paper:      #fafaf7;   /* page background */
--paper-2:    #f0efea;   /* alternating section background */
--paper-3:    #ffffff;   /* card / nav background */
--rouge:      #8a3b2e;   /* accent — use sparingly (active states, emphasis) */
--rouge-dark: #5c2418;   /* accent hover / pressed */
--gold:       #8a7a4a;   /* subtle secondary accent */
--gold-dark:  #5c5230;
--teal:       #3a4a48;   /* map polyline, rare accent */
--teal-dark:  #242f2d;
--border:     rgba(26,26,26,0.1);  /* hairline rules */
```

### Typography

```css
--font-display: 'Playfair Display', Georgia, serif;  /* all headlines, tour titles */
--font-serif:   'Playfair Display', Georgia, serif;  /* pull quotes, editorial */
--font-sans:    'Inter', system-ui, sans-serif;      /* body, nav, UI, meta */
--font-mono:    'Inter', system-ui, sans-serif;      /* same as sans in Quiet — no mono */
```

Load from Google Fonts: `Playfair Display: ital,wght@0,400;0,500;0,600;0,700;0,900;1,400` and `Inter: wght@300;400;500;600;700`.

**Type scale (guidance, not rigid):**
- Display (hero H1): `clamp(52px, 6.5vw, 84px)` · Playfair 500 · letter-spacing -0.02em · line-height 1
- H2 (section heads): 48px · Playfair 500 · letter-spacing -0.01em
- H3 (card titles): 28px · Playfair 600
- H4 (sub-titles): 20px · Playfair 600
- Body: 15–16px · Inter 400 · line-height 1.6–1.7 · color `--ink-2`
- Meta/label: 11–13px · Inter 500 · letter-spacing 0.05–0.15em · uppercase

### Spacing

- Section vertical padding: **96px** (desktop), 64px (mobile)
- Section horizontal padding: 32px
- Grid gaps: 32px (cards) / 72px (hero columns)
- Hairline rule: 1px solid `--border`

### Radii / Shadows

- Buttons / inputs: `border-radius: 2px`
- Cards: **no radius, no shadow** in Quiet — this is intentional. Use 1px borders and whitespace instead.

### Image treatment

- Full color (not sepia / not B&W) — Quiet uses real photography untreated.
- No filters on gallery or hero images.
- Aspect ratios: hero 3:2 or wider; gallery thumbs 1:1 or 4:5; stop photos 3:2.

## Interactions & Behavior

- **Smooth scroll** for in-page anchor nav (`#tours`, `#route`, etc.) with 70px top offset for the sticky nav.
- **Active nav state** updates on scroll — highlights the section the user is currently reading (the mock implements this in the final `<script>` block; lift the logic into Astro client script).
- **Route tabs** (Home §6 and tour pages): click swaps the stops list + re-renders the Mapbox markers/polyline. Don't animate — instant swap is fine.
- **FAQ accordion**: click expands one panel; multiple can be open simultaneously (not exclusive). Animate height with `transition: max-height 0.3s ease`.
- **Language toggle** (EN/FR): switches site content. The real site likely already has i18n — wire to existing.
- **Hover states:**
  - Primary button: solid `--ink` → outline on hover (transparent bg, ink text, ink border). No transform, no shadow.
  - Nav links: `--ink-2` → `--ink` on hover, 1px underline appears on active.
  - Tour cards: cursor pointer, subtle text-only `→` chevron shifts 4px right.
- **Responsive:**
  - `>900px`: 3-column grids, hero side-by-side.
  - `600–900px`: 2-column grids, hero still side-by-side but tighter.
  - `<600px`: single column, hero stacks (content first, offer second), nav collapses to a drawer (drawer markup is in the mock — keep the pattern).

## State Management

Minimal — this is a mostly static marketing site. Per-page state you'll need:

- **Current route tab** (home §6): `'left' | 'right' | 'general'` — default `'left'`.
- **FAQ open state**: `Set<string>` of open question IDs.
- **Language**: `'en' | 'fr'` — persisted (cookie / localStorage), same mechanism the real site already uses.
- **Mapbox instance**: one per page, re-center on tab switch.

No form state in this handoff (booking is handed off to external partners — GetYourGuide, Viator — via outbound link).

## Content

All copy is in the HTML mock — lift it directly. Tour data lives in the `STOPS` and `FAQ` objects near the bottom of `design/index.html` (~line 2420). Recommend porting this into a content collection (`src/content/tours/*.md` or similar Astro convention) and letting the Astro template pull from there.

**Tour data shape** (derive content collection schema from this):

```ts
{
  slug: 'left' | 'right' | 'general',
  title: string,           // "Left Bank · WW2"
  meta: string,            // "4 stops · 2.5 km · 2 h"
  heroImage: ImageMetadata,
  kicker: string,          // "Left Bank · WWII"
  subtitle: string,
  facts: string[],         // 4-5 "did you know" lines
  themes: { title: string, body: string }[],  // length 3
  stops: {
    n: number,
    title: string,
    blurb: string,
    time: string,          // "0:00", "0:35", etc.
    coords: [lng, lat]     // for Mapbox
  }[],
  gallery: { src: ImageMetadata, caption: string }[],
  bookingLinks: { getyourguide?: url, viator?: url, whatsapp: url },
  faq: [question, answer][]
}
```

## Assets

All hero and gallery photos reference `https://www.parishistorytours.com/photos/...` directly in the mock — the live site already has these. Keep the existing Astro image pipeline; don't re-download. The 5 local `.webp` files in this project (`bridge_alexander_third_paris.webp`, `luxembourg_palace_paris.webp`, `notre-dame-de-paris.webp`, `place_concorde_paris.webp`, `place_vendome_paris_day.webp`) are a subset used during prototyping — the real source files are already on the production server.

Partner logos (GetYourGuide / Viator / TripAdvisor / Paris je t'aime) — use the brands' official logo kits, not mock placeholders. Render grayscale (`filter: grayscale(1)`) at 60% opacity, 28px tall.

## Files in this handoff

- `design/index.html` — home page mock (Quiet direction, locked in)
- `design/tours/left-bank.html` — tour detail page mock (template for all three tours)

Both files are self-contained single HTML documents with inline CSS/JS. The `[data-dir="quiet"]` CSS block (around line 1242 of `index.html`) contains the overrides that define the Quiet aesthetic — this is the block to lift from.

Dormant CSS for three abandoned directions (Atelier, Archive, Cinema) is still present in the mock files but not applied (body is locked to `data-dir="quiet"`). Ignore and delete during the port.

## Recommended porting order

1. **Tokens first.** Extract the `:root, [data-dir="quiet"]` variable block into the global style layer. Everything downstream relies on these.
2. **Type system.** Confirm Playfair + Inter loading, set base `body` styles.
3. **Nav + footer.** Shared chrome — get these right once, reuse.
4. **Home hero + sections** top-to-bottom.
5. **Tour detail template.** Use Left Bank mock. Parameterize with tour data.
6. **Populate other two tours** (Right Bank, General History) from existing site content — same template, new data.
7. **Map integration.** Apply the styling (teal polyline, circle markers) to the existing Mapbox setup.
8. **QA in both languages, both mobile and desktop.**
