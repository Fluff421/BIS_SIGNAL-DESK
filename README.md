# BIS Signal Desk

Personal NCAAF / NFL research desk. It watches **every posted NFL and NCAAF game**, grades them after the final as **research** (not issued plays), and keeps ticket % **and** money/handle % on file so the library compounds through the 2026 season.

**75% ATS is a target, not a rate.** Nothing is issued until a human approves a side and `n ≥ 30` graded issued sides exist. Research grades (currently hundreds) are diagnostic only.

Live repo: [github.com/Fluff421/BIS_SIGNAL-DESK](https://github.com/Fluff421/BIS_SIGNAL-DESK)

---

## Why the full slate

Watching more games is how the desk gets smarter:

| What grows | Why it matters |
|---|---|
| Library (every posted game) | Every club accumulates a tape, not just the 3–7 pt band |
| Research grades | After a final, the stored line is graded. Sample size for calibration |
| Public lean snapshots | Ticket % and money % freeze at kick, so Monday still shows Sunday's split |
| Team intel | Per-club research ATS, upcoming slate, last result |
| Context (injuries, weather, rest) | Weak inputs lower confidence. They never fabricate an adjustment |

Issuing more plays would **not** speed this up. It would contaminate the 75% target. The library is the accelerator.

---

## Live data the desk actually uses

| Feed | What it contributes |
|---|---|
| Action Network scoreboard | Full NFL weeks 1–18 + NCAAF weeks 0–13 lines, books, ticket volume |
| SportsBettingDime | Primary **ticket % and money/handle %** on the live slate |
| WiseGuyTeam sharp-report | Second live **ticket % and money/handle %** sample |
| ScoresAndOdds | Backup ticket + money consensus |
| WagerTalk | Sunday sheet ticket + money (thin on weekdays) |
| SBR / Covers | Pick shares (not licensed handle) |
| ESPN CDN + site.web.api | Finals overlay so grades land the same day |
| CFBD | FPI snapshot (ensemble weight stays 0 until issued n ≥ 30) |
| The Odds API | Cross-check books (does not own the board) |
| NWS | Kickoff weather at stadium coordinates |
| Desk composer | Credit-free Grok 4.6 narrative from board data — no `api.x.ai` spend |

Public betting is **provisional**: SportsBettingDime and WiseGuyTeam are live handle feeds, not a licensed sportsbook dump. A 10-point money-versus-tickets gap is a research flag, not a ticket.

---

## How to use it through the season

Four GitHub Actions keep the tape live. You do not need to run scripts on your machine.

1. **Overview (every visit)** — honesty line, issued ATS (stays 0–0–0 until you issue), research library, slate mix, clubs on file, money-vs-tickets flags.
2. **Board** — full posted slate. `WATCH` is the 3–7 pt issuance band. `HIGH_NOISE` / `STALE_FPI` stay suppressed. Open a matchup for injuries, weather, rest, and public lean.
3. **Quality** — source health, path to 30 **issued** sides, club library, handle coverage.
4. **Digest** — weekly brief generated from the board. Narrative is research language only.
5. **Ledger** — issued grades only. Empty is correct until you approve a cohort.
6. **Model** — FPI + HFA spec. Ensemble weight is 0 until issued n ≥ 30.

### Weekly rhythm

- **Tuesday–Wednesday** — FPI refresh, injury reports, weather. Scan WATCH rows. Nothing is a play yet.
- **Thursday–Sunday** — universe job runs four times a day. Public lean fills in. WagerTalk is useful on Sundays.
- **After each final** — ESPN overlay grades the stored consensus as RESEARCH. Club tapes update. Issued ledger does not.
- **Monday** — read Digest. Note money-vs-tickets flags that aged into results. Do not quote research ATS as 75%.
- **When you are ready to issue** — pick a WATCH row with every hard gate green, record it as issued **before kick**, then let the ledger grade it. The 75% clock starts at issued n = 1, and is only discussable at issued n ≥ 30.

### What will improve as the year progresses

- **n (research)** grows every Saturday/Sunday automatically.
- **Club tapes** get a second, third, fourth data point. Week-1 openers stop being the whole story.
- **Public-lean history** lets you see whether fade-the-public or follow-the-handle would have helped — still diagnostic.
- **Calibration** of the 3–7 pt band vs actual ATS. If the clean band is not north of ~55% by midseason, do not issue.
- **Issued 75%** only starts after you approve a cohort. The desk will not mint plays to hurry that number.

### What the desk will not do

- Quote 75% with n = 0 issued.
- Promote a WATCH row to ISSUED without you.
- Treat Covers/SBR pick % as handle.
- Spend xAI credits on narrative (the composer is credit-free).
- Scrape a licensed sportsbook's private hold.

---

## GitHub automation (already live)

| Workflow | Cadence | Job |
|---|---|---|
| [Refresh Universe](https://github.com/Fluff421/BIS_SIGNAL-DESK/actions/workflows/refresh-universe.yml) | 4× daily | Expand NFL + NCAAF library, overlay public lean, grade research, commit JSON |
| [Refresh Board](https://github.com/Fluff421/BIS_SIGNAL-DESK/actions/workflows/refresh-board.yml) | 4× daily | FPI snapshot + issued ledger only (does **not** overwrite the library) |
| [Weekly Digest](https://github.com/Fluff421/BIS_SIGNAL-DESK/actions/workflows/weekly-digest.yml) | weekly | Brief from the current board |
| [CI](https://github.com/Fluff421/BIS_SIGNAL-DESK/actions/workflows/ci.yml) | on push | Typecheck / tests |

Secrets already used: `ODDS_API_KEY`, `CFBD_API_KEY`. Universe refresh does not need them.

Manual run: Actions → Refresh Universe → Run workflow.

---

## Local development

```bash
npm install
npm run dev          # preview
npm run build
npm run typecheck
npm test
```

Auth is off. Do not commit API keys.

---

## Honesty contract

- Research ATS ≠ issued ATS.
- A large model–market gap is a data-quality question first.
- Missing context lowers confidence; it never invents a number.
- Target remains **75% ATS after n ≥ 30 graded issued sides**. Until then the only honest line is: not measurable.
