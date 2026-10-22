# Larder

**Larder tells you what's about to go bad — and what you can cook with it tonight.**

A mobile-first kitchen inventory app. It ranks everything you own by days left, turns the most urgent items into recipe suggestions, and tracks the money and food you save. It is a frontend-only demo: no backend, no accounts, no API calls. Data lives in `localStorage`; the catalogue and recipes ship as bundled JSON. It installs as a PWA and works fully offline.

The core loop: **add items after shopping → see the "use soon" list → pick a suggested recipe → mark ingredients used → watch savings tick up.**

## Features

| #   | Feature                   | What it does                                                                                                                                                                                                                 |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Quick add & bulk add**  | Type a name; autocomplete from a 158-item catalogue fills in emoji, location, shelf life, unit and price (all editable). "Just shopped" mode parses a list like `2 milk, spinach, 6 eggs, 500g paneer` into reviewable rows. |
| 2   | **Use Soon list**         | Home ranks everything into urgency bands — Expired, Today, 1–2 days, 3–5 days, Later — with a freshness ring and a "What can I cook?" headline card.                                                                         |
| 3   | **Recipe matcher**        | 42 bundled recipes (Indian home cooking + quick global dishes) scored by how many urgent items they use. Filters for max time, vegetarian and "only what I have", with a "closest matches" fallback.                         |
| 4   | **Use up & toss**         | Swipe right = Used, swipe left = Toss (with button fallbacks). Partial quantities via a stepper; tossing asks a one-tap reason. Every action has an undo toast. "Cooked this" consumes a recipe's ingredients in one go.     |
| 5   | **Inventory by location** | Fridge / Freezer / Pantry tabs, search, sort by expiry or name, and an item detail screen to edit, move, freeze or delete. Moving to the freezer extends expiry using the catalogue's freezer shelf life.                    |
| 6   | **Impact**                | Money saved this month, items wasted, waste rate, an 8-week used-vs-tossed chart (with a text summary), most-wasted items and the top toss reason.                                                                           |

Also: light/dark themes, currency symbol, JSON export, reset demo data, clear all data, and a dismissible first-run banner.

## Recipe scoring rule

Implemented as pure functions in [`src/lib/scoring.ts`](src/lib/scoring.ts) and unit-tested.

For each recipe:

- Each **required** ingredient you have scores by urgency of the matching item:
  - **+10** if it expires in **≤ 2 days**
  - **+5** if it expires in **3–5 days**
  - **+1** otherwise
- Each **missing required** ingredient scores **−6**.
- **Optional** ingredients never penalise (and don't add points).
- **Pantry staples** — salt, oil, black pepper, water — are always assumed present.
- If you own several of the same item, the most urgent one is used. Expired items are never suggested.

Recipes are sorted by **score (high → low)**, then **fewest missing**, then **fewest minutes**. The "Only what I have" filter hides any recipe with a missing required ingredient. If filters leave nothing, the top "closest matches" are shown instead.

Other rules:

- `daysLeft = expiresAt − today` (calendar days). Bands: Expired `< 0`, Today `0`, Soon `1–2`, This week `3–5`, Later `6+`.
- **Money saved** = value of `used` events that happened on or before the item's expiry.
- **Waste rate** = tossed value ÷ (used value + tossed value).

## Stack

- Vite + React 19 + TypeScript (strict, no `any`)
- Tailwind CSS v4 with shadcn-style components on Radix primitives (dialog, tabs, switch)
- React Router (`HashRouter`) — works on any static host and from a subpath (`base: './'`)
- Zustand with `persist` (key `larder.v1`)
- Framer Motion — swipe rows, sheets, list exits, count-ups, confetti; respects `prefers-reduced-motion`
- Recharts (lazy-loaded with the Impact screen), date-fns, lucide-react
- vite-plugin-pwa — installable, offline
- Vitest, ESLint, Prettier

## Run it

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (urgency, scoring, bulk parser, impact maths, seed data)
npm run lint
npm run build      # static output in dist/
npm run preview    # serve the production build
```

## Project structure

```
src/
  components/   UI primitives (button, sheet, segmented, stepper…) and shared pieces (ItemRow, RecipeCard, FreshnessRing…)
  routes/       Home, AddSheet, Inventory, ItemDetail, Recipes, RecipeDetail, Impact
  store/        Zustand stores: larder data (persisted), toasts, UI state
  lib/          Pure logic: dates/urgency, scoring, parseBulk, impact, catalogue lookup, units
  data/         catalogue.json, recipes.json, seed.ts (dates relative to today)
```

## Seed data

On first run the app loads a sample Indian-urban kitchen: 35 items (Fridge 18, Freezer 7, Pantry 10) with dates relative to today — 2 expired, 3 due today, 5 in 1–2 days, 6 in 3–5 days, the rest later — plus ~70 events over 8 weeks showing a falling waste trend, "Forgot" as the top toss reason, and spinach and coriander as the most wasted. At least three recipes (palak paneer, paneer bhurji, kadai paneer…) use today's items with nothing missing. Reset it any time from Settings.

## Design

A warm, tactile kitchen companion: cream background (warm charcoal in dark mode), a fresh green accent, Bricolage Grotesque headings and Inter for UI. Layout and motion take cues from Bevel — soft rounded cards, big numerals, ring gauges and springy interactions. Urgency uses a dedicated colour scale (red → orange → amber → yellow → neutral) that is always paired with a text label.

Accessibility: Lighthouse accessibility 100 on all main routes, 44 px tap targets, full keyboard support, visible focus, swipe actions mirrored by buttons, and a text summary plus data table for the chart.
