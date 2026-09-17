import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  deskBoard,
  deskHealth,
  deskTeams,
  deskSnapshot,
  deskContext,
  deskEspn,
  deskResearch,
  deskTeamIntel,
  deskPublicBetting,
  FPI_AGE_HOURS,
  divergenceRows,
  fmtKickLong,
  publicLeanLine,
} from "@/lib/desk";
import { ClassBadge } from "@/components/class-badge";
import { SlateMap } from "@/components/slate-map";
import { Button } from "@/components/ui/button";
import { probeLiveSources } from "@/lib/providers";

export const Route = createFileRoute("/quality")({ component: QualityPage });

function QualityPage() {
  const c = deskBoard.counts;
  const unsetConf = deskTeams.teams.filter((t) => !t.conference).length;
  const missingCtx = deskContext.features.filter((f) => f.quality === "missing").length;
  const [live, setLive] = useState<Awaited<ReturnType<typeof probeLiveSources>> | null>(null);
  const [busy, setBusy] = useState(false);
  const cov = deskPublicBetting.coverage;
  const divergences = divergenceRows(deskBoard.observe ?? [], 10).slice(0, 8);

  async function probe() {
    setBusy(true);
    try {
      setLive(await probeLiveSources());
    } finally {
      setBusy(false);
    }
  }

  const espnStatus = live?.espn.status ?? deskHealth.espn.status;
  const grokStatus = live?.grok.status ?? deskHealth.grok.status;
  const finals = deskEspn.ncaaf.rows.filter((r) => r.completed);
  const researchPct = Math.min(100, (deskResearch.ats.n / 30) * 100);
  const topClubs = deskTeamIntel.teams.filter((t) => t.n >= 1).slice(0, 24);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl">Data quality</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          The desk watches the full posted NFL and NCAAF slates — college current plus weeks 0–13,
          NFL current plus weeks 1–18 — so every club accumulates a library. Public lean is ticket
          % plus SportsBettingDime money/handle % (ScoresAndOdds and WagerTalk as backups; snapshots
          persist after kick). Issued 75% still needs human approval.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h3 className="font-display text-xl">Path to 30 graded sides</h3>
        <p className="mt-2 font-display text-3xl tabular-nums">{deskResearch.ats.n} / 30 research</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-elevated">
          <div className="h-full bg-watch" style={{ width: `${researchPct}%` }} />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{deskResearch.pathTo30.note}</p>
        <p className="mt-3 font-mono text-xs text-subtle">
          Research {deskResearch.ats.hits}–{deskResearch.ats.misses}–{deskResearch.ats.pushes} (n=
          {deskResearch.ats.n}
          {deskResearch.ats.rate != null ? ` · ${Math.round(deskResearch.ats.rate * 100)}%` : ""}) ·
          issued 0–0–0 · slate {c.observe} · library {c.library} / {c.teamsCovered} clubs. Research is
          not the 75% issued target.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs text-muted uppercase">Research slate</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{c.observe}</p>
          <p className="mt-1 text-xs text-subtle">Upcoming games with a posted line</p>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs text-muted uppercase">Library</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{c.library}</p>
          <p className="mt-1 text-xs text-subtle">
            {c.completed} finals · {c.nfl} NFL · {c.ncaaf} NCAAF
          </p>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs text-muted uppercase">Bet / pick %</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{cov.ticketPct}</p>
          <p className="mt-1 text-xs text-subtle">
            SBR {cov.sbrPicks} · Covers {cov.coversPicks} · volume {cov.ticketVolume}
          </p>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs text-muted uppercase">Money %</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{cov.moneyPct}</p>
          <p className="mt-1 text-xs text-subtle">
            SAO {cov.scoresandoddsMatched ?? 0} · SBD {cov.sportsbettingdimeMatched ?? 0} · WT{" "}
            {cov.wagertalkMatched ?? 0} · gaps {cov.divergenceFlags ?? 0}
          </p>
        </div>
      </section>

      {divergences.length ? (
        <section>
          <h3 className="mb-2 font-display text-xl">Handle vs tickets</h3>
          <p className="mb-3 max-w-2xl text-sm text-muted">
            When money % and ticket % disagree by 10 points or more, a smaller number of larger
            bets is on one side. Research flag only — not a ticket.
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {divergences.map((r) => (
              <li
                key={r.eventId ?? `${r.away}-${r.home}`}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm">
                    {r.away} @ {r.home}
                  </p>
                  <p className="font-mono text-[11px] text-subtle">
                    {r.league} · {fmtKickLong(r.kick)}
                  </p>
                </div>
                <p className="font-mono text-xs text-watch">{publicLeanLine(r.publicBetting)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div>
        <Button variant="outline" disabled={busy} onClick={() => void probe()}>
          {busy ? "Probing…" : "Probe live sources"}
        </Button>
        {live ? (
          <p className="mt-2 font-mono text-xs text-subtle">
            Live {live.at} · ESPN {live.espn.status} NFL {live.espn.nflEvents} NCAAF {live.espn.ncaafEvents} ·
            Grok {live.grok.status} {live.grok.failureCode ?? ""}
          </p>
        ) : null}
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["The Odds API", deskHealth.odds],
            ["CFBD", deskHealth.cfbd],
            ["ESPN", { ...deskHealth.espn, status: espnStatus }],
            ["Grok 4.6", { ...deskHealth.grok, status: grokStatus }],
            ["Action Network", deskHealth.actionnetwork ?? { status: "degraded" }],
            ["SportsBettingDime", deskHealth.sportsbettingdime ?? { status: "degraded" }],
            ["ScoresAndOdds", deskHealth.scoresandodds ?? { status: "degraded" }],
            ["WagerTalk", deskHealth.wagertalk ?? { status: "degraded" }],
            ["SBR + Covers", deskHealth.sbr ?? { status: "degraded" }],
          ] as const
        ).map(([name, s]) => (
          <div key={name} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg">{name}</h3>
              <ClassBadge value={s.status} />
            </div>
            <p className="mt-3 font-mono text-xs text-subtle">
              last {("lastSuccessAt" in s ? s.lastSuccessAt : null) ?? "—"}
              {"httpStatus" in s && s.httpStatus != null ? ` · HTTP ${s.httpStatus}` : ""}
            </p>
            {"reason" in s && s.reason ? <p className="mt-2 text-sm text-muted">{s.reason}</p> : null}
            {"sportsFetched" in s && Array.isArray(s.sportsFetched) ? (
              <p className="mt-2 font-mono text-xs text-subtle">{s.sportsFetched.join(" · ")}</p>
            ) : null}
            {"failureCode" in s && s.failureCode ? (
              <p className="mt-2 font-mono text-xs text-watch">{s.failureCode}</p>
            ) : null}
          </div>
        ))}
      </section>

      <section>
        <h3 className="mb-2 font-display text-xl">Club library (research ATS)</h3>
        <p className="mb-3 max-w-2xl text-sm text-muted">
          {deskTeamIntel.withGrades} of {deskTeamIntel.teamCount} clubs already have at least one
          research grade. Watching the whole slate is how the desk gets smarter — not by minting
          plays.
        </p>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {topClubs.map((t) => (
            <li key={`${t.league}-${t.team}`} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm">{t.team}</p>
                <p className="font-mono text-[11px] text-subtle">
                  {t.league} · {t.games} games on file · {t.upcoming} upcoming
                </p>
              </div>
              <p className="font-mono text-sm tabular-nums">
                {t.hits}–{t.misses}–{t.pushes}
                {t.rate != null ? ` · ${Math.round(t.rate * 100)}%` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-display text-xl">ESPN results tape</h3>
        <p className="mb-3 max-w-2xl text-sm text-muted">
          {finals.length} NCAAF finals on the current CDN board. These are results, not issued grades.
          NFL Week {deskEspn.nfl.week ?? "—"} is still scheduled ({deskEspn.nfl.rows.length} events).
        </p>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {finals.slice(0, 8).map((g) => (
            <li key={g.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between">
              <span className="text-sm">
                {g.away} {g.awayPoints} @ {g.home} {g.homePoints}
              </span>
              <span className="font-mono text-xs text-subtle">
                {g.kick.slice(0, 10)} · margin {g.actualMargin}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs text-muted uppercase">Suppressed stale</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{c.staleFpi}</p>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs text-muted uppercase">High noise</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{c.highNoise}</p>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs text-muted uppercase">Canonical teams</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{deskTeams.teams.length}</p>
          <p className="mt-1 text-xs text-subtle">{unsetConf} without conference</p>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs text-muted uppercase">FPI age</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{FPI_AGE_HOURS.toFixed(0)}h</p>
          <p className="mt-1 text-xs text-subtle">as of {deskSnapshot.asOf.slice(0, 10)}</p>
        </div>
      </section>

      <SlateMap rows={[...deskBoard.watch, ...deskBoard.highNoise]} />

      <section>
        <h3 className="mb-3 font-mono text-xs tracking-wide text-muted uppercase">
          Context layer ({missingCtx} still missing)
        </h3>
        <p className="mb-3 text-sm text-muted">{deskContext.policy}</p>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {deskContext.features.map((f) => (
            <li key={f.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:justify-between">
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-sm text-muted">{f.note}</p>
              </div>
              <ClassBadge value={f.quality} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-subtle">{deskPublicBetting.methodology}</p>
      </section>
    </div>
  );
}