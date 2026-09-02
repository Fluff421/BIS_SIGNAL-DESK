# BIS Signal Desk

Sports desk workspace for NCAAF / NFL analysis.

## Features
- **Board** – issued plays & watch list
- **Ledger** – ATS tracking
- **Model** – FPI + home-field advantage engine
- **Digest** – weekly intelligence brief
- Calendar honesty & snapshot views

## Stack
- TanStack Start / React 19 / Vite
- Tailwind CSS
- Better Auth (currently disabled)
- Nitro (Vercel preset)

## Local development

```bash
npm install
npm run dev          # http://0.0.0.0:8080
npm run build
npm run preview      # http://127.0.0.1:8081
```

## Scripts
- `npm run typecheck`
- `npm test`
- `npm run check:auth`

Auth is disabled by default (see `.grok/app-env.json`).

## Live odds & historical data

```bash
cp .env.example .env   # add ODDS_API_KEY and CFBD_API_KEY
export $(grep -v '^#' .env | xargs)

npm run odds:probe     # verify keys
npm run odds:update    # refresh src/data/board.json from The Odds API
npm run odds:backfill  # CFBD historical (optional; uses quota)

npm run dev
```

**Never commit API keys.** Free tiers are limited (Odds API credits; CFBD ~1k calls/mo).

Target remains **75% ATS** after **n ≥ 30** graded regular-season sides. Live edges are research until the ledger has sample.
