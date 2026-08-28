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
