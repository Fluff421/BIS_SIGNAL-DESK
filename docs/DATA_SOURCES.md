# BIS Signal Desk — Data Sources & Intelligence Pipeline

**Target:** 75% ATS after n ≥ 30 graded regular-season sides.
**Engine today:** FPI + home-field advantage only. BIM ensemble remains spec until fitted.

## Can we use past years of odds + results?

**Yes.** Historical results and (selectively) odds are available. That improves calibration and feature learning; it does **not** guarantee 75% ATS in 2026.

### Recommended free / low-cost stack

| Need | Source | Notes |
|------|--------|--------|
| NFL scores, schedules, EPA, some spreads | **nflverse** (`nflreadpy`) | Free bulk releases; years of PBP + schedules |
| NCAAF scores, advanced metrics, **historical betting lines** | **CollegeFootballData (CFBD)** | Free key (1k calls/mo); betting lines on free tier |
| Live + upcoming odds (NFL + NCAAF) | **The Odds API** | Free tier ~500 credits/mo; sport keys `americanfootball_nfl`, `americanfootball_ncaaf` |
| Historical odds snapshots (paid) | The Odds API Historical | From ~mid-2020; higher credit cost |
| Alt live / history | OddsPapi, ParlayAPI, SportsDataIO | Compare cost vs depth |

### What “advanced learning” actually means here

1. **Backtest** FPI+HFA (and later BIM features) vs **closing** spreads on 2023–2025.
2. Measure ATS hit rate, CLV (close-line value), and calibration by edge bucket.
3. Only then raise `playThreshold` or fit ensemble weights.
4. Keep Week 0 / preseason at reduced sample weight (already in `model.json`).

## Live odds — “find its own API”

The desk does not invent private APIs. It uses a **discovery catalog** plus optional probes:

```bash
node scripts/discover-odds-apis.mjs
# With keys (optional probes):
ODDS_API_KEY=... CFBD_API_KEY=... node scripts/discover-odds-apis.mjs --probe
```

Live board refresh (writes `src/data/board.json` shape):

```bash
ODDS_API_KEY=your_key node scripts/update-board-from-odds.mjs
# Optional: also pull CFBD lines when key present
CFBD_API_KEY=your_key node scripts/update-board-from-odds.mjs --ncaaf-only
```

Register free keys:

- The Odds API: https://the-odds-api.com/
- CFBD: https://collegefootballdata.com/

Store keys in env only — never commit them.

## Thursday readiness (minimal)

1. Get `ODDS_API_KEY` (and optionally `CFBD_API_KEY`).
2. Run `discover-odds-apis.mjs --probe`.
3. Run `update-board-from-odds.mjs` and open `npm run dev`.
4. Issue **0–few** plays; grade after finals into `ledger.json`.
5. Historical backfill can run in parallel; it is not required to show this week’s board.

## Honesty constraints

- n=0 → 75% is **not measurable**.
- Historical fit does not transfer perfectly to a new season.
- Watch threshold remains |edge| ≥ 3 until graded sample supports plays.
