# BIS Signal Desk — Master Operations

**Target:** 75% ATS after n ≥ 30 graded regular-season sides (selective).
**Honesty:** n=0 means the target is not measurable. Automation does not invent edge quality.

## Daily / automated loop

1. `update-fpi.mjs` — refresh FPI priors (ESPN, CFBD fallback)
2. `odds:update` — live consensus spreads + FPI+HFA edges + confidence + line movement
3. `grade-results.mjs` — grade past NCAAF watch rows via CFBD finals
4. Monday: `generate-digest.mjs` + optional `refit-ensemble.mjs` when n≥30

## GitHub Actions

| Workflow | Trigger | Secrets |
|----------|---------|--------|
| `ci.yml` | push/PR | none |
| `refresh-board.yml` | 4× daily + manual | `ODDS_API_KEY`, `CFBD_API_KEY` |
| `weekly-digest.yml` | Monday + manual | `CFBD_API_KEY`, optional `GROK_API_KEY` |

Configure secrets: Repo → Settings → Secrets and variables → Actions.

## Confidence flags

| Flag | Meaning | Action |
|------|---------|--------|
| `WATCH` | edge 3–10 | Primary research band |
| `HIGH_NOISE` | edge 10–20 | Caution |
| `STALE_FPI` | edge > 20 | Stored under `staleFpi`, not primary `watch` |
| `ALIGNED` | edge ≤ 3 | Filtered out by threshold |

## Weekly feedback

Digest states **helpers** and **hurters**, ATS sample, and confidence tier.

## Local commands

```bash
export ODDS_API_KEY=... CFBD_API_KEY=...
npm run fpi:update
npm run odds:update
npm run grade
npm run digest
npm run ensemble:refit
npm run dev
```

Never commit API keys.
