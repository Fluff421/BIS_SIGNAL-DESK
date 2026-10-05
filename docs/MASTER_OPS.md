# BIS Signal Desk — Master Operations

**Target:** 75% ATS after n ≥ 30 graded **issued** regular-season sides.
**Honesty:** Issued ATS starts at 0-0-0. Research grades are diagnostic only. Automation never promotes a row.

## Product contract

- Nothing is a play until a human explicitly approves one side on one WATCH row **before kickoff**.
- `issue:play` / the Issue play Action is the source of truth. The browser cannot persist Issued.
- WATCH is the issuance band. HIGH_NOISE and STALE_FPI stay suppressed.
- Research grades must never be copied into the issued record.
- n ≥ 30 graded issued sides is only the gate for **discussing** 75%. It does not block issuing side 1.
- The desk does not mint plays to hurry that number.

## Issuance gates (`src/lib/gates.ts`)

Hard gates (every one must be `pass` for `allHardGreen`):

| Gate | Fail when |
|------|-----------|
| Stored market line | No `marketHome` or no `observedAt` |
| 3 to under 7 pt band | `\|edge\| < 3` or `\|edge\| ≥ 7` |
| WATCH class only | `dataClass` is not `WATCH` |
| Canonical team match | `teamMatchWarning` |
| Context resolved | `unresolvedContext` (NFL needs both clubs on the ESPN injury snapshot) |
| Kickoff still ahead | Kickoff timestamp has passed |
| 3+ sportsbooks | `nBooks < 3` or `lowLiquidity` |

**Book minimum is 3.** That is the same floor `scripts/refresh-universe.mjs` uses (`lowLiquidity: nBooks < 3`). Do not invent a second number.

Not hard gates:

| Flag | Meaning |
|------|---------|
| `humanReview` | Written by the issue action after approval. Not a pre-green gate. |
| `quote75Allowed` (`gradedN >= 30`) | Reporting only. Never inside `allHardGreen`. |

## Preserve issued rows

`scripts/preserve-issued.mjs` is the single helper.

- `refresh-universe.mjs` and `update-board-from-odds.mjs` both call it.
- A rebuild that sets `issuedPlays: []` still writes the previous issued row (match by `eventId`, else kick+home+away).
- A refresh may update score, status, and closing line. It must not move the row back to watch, change `approvedSide`, or drop it.

## Research versus issued

| Book | Writer | Counts toward 75% |
|------|--------|-------------------|
| Issued ATS (`ledger.json` → `regular.ats`) | `grade-results.mjs` over **issuedPlays** only | Yes, after a real issued side is graded |
| Research tape (`research-ledger.json`) | Universe overlay + `grade-results.mjs` over watch / highNoise / staleFpi | No |

`grade-results.mjs` uses scores already stored on the row. It does not backfill today's research results into the issued record. Mirror `ledger.json` to `public/data/ledger.json`.

## Daily / automated loop

1. `refresh-universe.yml` — full NFL + NCAAF library, public lean, research grades. Preserves issued plays.
2. `refresh-board.yml` — FPI snapshot + issued ledger only. Does **not** overwrite the library board.
3. `grade-results.mjs` — split grading as above.
4. Monday: weekly digest. Ensemble weight stays 0 until issued n ≥ 30.

## How to issue a side

```bash
npm run issue:play -- --event "<eventId>" --side home|away --note "why this side"
```

Or Actions → **Issue play** → `event`, `side`, `note`.

The script refuses missing args, a row not in WATCH, a red hard gate, a past kickoff, and a second issue of the same eventId. It writes only `src/data/board.json` and `public/data/board.json`.

## GitHub Actions

| Workflow | Trigger | Writes |
|----------|---------|--------|
| `ci.yml` | push/PR | none (typecheck, test, build) |
| `refresh-universe.yml` | 4× daily + manual | library / board / public lean |
| `refresh-board.yml` | 4× daily + manual | FPI snapshot + issued ledger |
| `weekly-digest.yml` | Monday + manual | digest |
| `issue-play.yml` | **manual only** | the two board files |

Never commit API keys.
