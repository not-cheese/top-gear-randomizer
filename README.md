# Top Gear Randomizer

Spin a wheel to pick which Top Gear episode to watch next (Clarkson era, series 1–22,
2002–2015, including the truncated series 22 and the specials).

- Spinning wheel with preset and custom collections
- Watched tracking, grouped by series
- Everything is stored in your browser (IndexedDB and localStorage). No accounts, no server database.
- Export and import your watched list and collections as JSON

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm test` | Unit tests, including a check of the data files |
| `npm run validate` | Checks `src/data/*.json` for mistakes |
| `npm run categories` | Rewrites each episode's categories from `presets.json` |
| `npm run build` | Production build into `dist/` |
| `npm run deploy` | Validates, builds, then deploys with Wrangler |

## Editing the episode data

Data lives in `src/data/` and is plain JSON.

- `episodes.json` is the master catalogue. Regular episodes use ids like `S05E06`;
  unnumbered specials use `SP-<name>-<year>` with `"episode": null`. **Never change an
  existing id**, because users' saved data refers to it.
- `presets.json` holds the preset collections as lists of episode ids. You can add, remove
  and reorder ids freely, and add new presets with an id starting `preset-`. Don't change an
  existing preset's `id`.
- Categories are **derived from the presets**, not typed by hand: episodes in the specials preset are
  `Special`, all others are `Standard`, and the Races, Cheap Car and Creation presets add `Race`,
  `CheapCar` and `Creation`. The mapping lives in `scripts/categories.mjs`.

After editing presets, run `npm run categories` to refresh the categories, then `npm run validate`. It reports unknown ids, duplicates, bad dates and so on.
The episode titles and dates came from Wikipedia's episode list and epguides.com/TVmaze;
categories and the preset lists are hand-judged drafts.

## Project layout

```
src/
  data/         episodes.json, presets.json
  domain/       pure logic (randomizer, wheel maths, search, import/export). No React, no browser APIs
  storage/      IndexedDB repositories and the localStorage preferences wrapper
  state/        AppProvider: opens storage once, exposes data and actions via useApp()
  components/   wheel, episode rows, layout
  pages/        Spin, Collections (+ detail), Watched, Data
  styles/       CSS
scripts/        validate-catalogue.mjs
tests/          Vitest
src/index.js    Worker entry: passes requests through to the built static assets
```

## Deploying

Hosted on Cloudflare Workers with static assets (`wrangler.jsonc`). `npm run deploy` runs the
validator, builds the app, and uploads `dist/`.
