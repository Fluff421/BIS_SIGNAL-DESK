import { createFileRoute, Link } from "@tanstack/react-router";
import {
  deskLedger,
  deskSnapshot,
  deskBoard,
  deskModel,
  deskDigest,
  deskResearch,
  deskPublicBetting,
  fmtKickLong,
  fmtSpread,
  publicLeanLine,
  divergenceRows,
} from "@/lib/desk";
import { ClassBadge } from "@/components/class-badge";
import { HealthStrip } from "@/components/health-strip";
import { TeamMark } from "@/components/team-mark";
import { EdgeMeter } from "@/components/edge-meter";
import { Pipeline } from "@/components/pipeline";
import { WeekTape } from "@/components/week-tape";
import { SlateMap } from "@/components/slate-map";

export const Route = createFileRoute("/")({ component: Home });

function MixBar() {
  const c = deskBoard.counts;
  const total = Math.max(1, c.watch + c.highNoise + c.staleFpi);
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-elevated">
        <div className="bg-watch" style={{ width: `${(c.watch / total) * 100}%` }} />
        <div className="bg-muted" style={{ width: `${(c.highNoise / total) * 100}%` }} />
        <div className="bg-miss" style={{ width: `${(c.staleFpi / total) * 100}%` }} />
      </div>
      <p className="mt-2 font-mono text-[11px] text-subtle">
        {c.watch} band · {c.observe} slate · {c.library} library · {c.issued} issued
      </p>
    </div>
  );
}

function Home() {
  const ats = deskLedger.regular.ats;
  const next = [...deskBoard.watch].sort((a, b) => a.kick.localeCompare(b.kick)).slice(0, 6);
  const slate = [...(deskBoard.observe ?? [])]
    .filter((r) => r.dataClass !== "STALE_FPI")
    .sort((a, b) => a.kick.localeCompare(b.kick))
    .slice(0, 8);
  const c = deskBoard.counts;
  const cov = deskPublicBetting.coverage;
  const gaps = divergenceRows(deskBoard.observe ?? [], 10).slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <p className="font-mono text-xs tracking-wide text-watch uppercase">Operating stance</p>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-fg">
          {deskSnapshot.honesty} A large model–market disagreement is a data-quality question first,
          not a ticket.
        </p>
        <p className="mt-3 text-sm text-muted">
          {deskSnapshot.calendar.ncaaf} {deskSnapshot.calendar.nfl}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <p className="font-mono text-xs tracking-wide text-watch uppercase">Why the full slate</p>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-fg">
          Watching every posted NFL and NCAAF game is how the desk learns clubs, not how it mints
          tickets. More games mean more research grades, per-team tapes, and public-lean snapshots
          after kick — the library the 75% issued target will eventually draw from.
        </p>
        <p className="mt-3 text-sm text-muted">
          Issued n stays 0 until a human approves a cohort. Research n = {deskResearch.ats.n} is
          diagnostic. Ticket % on {cov.ticketPct ?? 0} games, money/handle % on {cov.moneyPct ?? 0}.
        </p>
      </section>

      <HealthStrip />

      <section>
        <h2 className="mb-3 font-display text-xl">How a row becomes a play</h2>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted">
          The desk is parked on research. Nothing on this board is issued. Promotion is human-gated
          and blocked until n ≥ 30 graded issued sides. Watching the whole slate fills the library
          that issuance will eventually draw from.
        </p>
        <Pipeline active="research" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs tracking-wide text-muted uppercase">ATS (issued)</p>
          <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">
            {ats.hits}–{ats.misses}–{ats.pushes}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-subtle">
            n = 0. 75% is a target, not a rate, until 30 graded issued sides.
          </p>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs tracking-wide text-muted uppercase">Research library</p>
          <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">
            {deskResearch.ats.hits}–{deskResearch.ats.misses}–{deskResearch.ats.pushes}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-subtle">
            n = {deskResearch.ats.n} graded vs stored line. Diagnostic, not issued.
          </p>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs tracking-wide text-muted uppercase">Slate mix</p>
          <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">{c.observe}</p>
          <div className="mt-3">
            <MixBar />
          </div>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <p className="font-mono text-xs tracking-wide text-muted uppercase">Clubs on file</p>
          <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">{c.teamsCovered}</p>
          <p className="mt-2 text-sm leading-relaxed text-subtle">
            {c.library} games · money % {cov.moneyPct ?? c.moneyPct ?? 0} · {c.nfl} NFL · {c.ncaaf} NCAAF
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl">Week tape</h2>
        <WeekTape rows={deskBoard.observe?.length ? deskBoard.observe : deskBoard.watch} />
      </section>

      <SlateMap rows={deskBoard.observe?.length ? deskBoard.observe : deskBoard.watch} />

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl">Issuance band (research only)</h2>
          <Link to="/board" className="min-h-11 text-sm text-muted hover:text-fg">
            Full board
          </Link>
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {next.map((w) => (
            <li
              key={w.eventId ?? `${w.away}-${w.home}`}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <TeamMark name={w.away} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {w.away} {w.neutral ? "vs" : "@"} {w.home}
                  </p>
                  <p className="text-sm text-muted">
                    {w.league} · {fmtKickLong(w.kick)} · mkt {fmtSpread(w.marketHome)} ·{" "}
                    {w.nBooks ?? "—"} books
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-subtle">{publicLeanLine(w.publicBetting)}</p>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-2 sm:w-48">
                <div className="flex w-full items-center justify-between gap-2">
                  <ClassBadge value={w.dataClass ?? "WATCH"} />
                  <p className="font-mono text-sm tabular-nums text-watch">{Number(w.edge).toFixed(1)}</p>
                </div>
                <EdgeMeter edge={w.edge} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {slate.length ? (
        <section>
          <h2 className="mb-3 font-display text-xl">Rest of the research slate</h2>
          <p className="mb-3 max-w-2xl text-sm text-muted">
            These games are watched so the library learns every club — they are not 3–7 pt candidates.
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {slate.map((w) => (
              <li key={w.eventId ?? `${w.away}-${w.home}`} className="flex justify-between gap-3 px-4 py-3">
                <span className="text-sm">
                  {w.away} @ {w.home}
                  <span className="text-subtle"> · {w.league}</span>
                </span>
                <span className="font-mono text-xs text-subtle">{w.dataClass}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {gaps.length ? (
        <section>
          <h2 className="mb-3 font-display text-xl">Money vs tickets</h2>
          <p className="mb-3 max-w-2xl text-sm text-muted">
            SportsBettingDime handle share versus ticket share. A 10-pt gap is a research flag, not
            a play.
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {gaps.map((w) => (
              <li
                key={w.eventId ?? `${w.away}-${w.home}`}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm">
                  {w.away} @ {w.home}
                  <span className="text-subtle"> · {w.league}</span>
                </span>
                <span className="font-mono text-xs text-watch">{publicLeanLine(w.publicBetting)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-display text-xl">How this desk runs a season</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted">
          <li>
            Four times a day the universe job pulls every posted NFL (weeks 1–18) and NCAAF (weeks
            0–13) line, ESPN results, injuries, weather, SportsBettingDime ticket/money splits,
            ScoresAndOdds, and the WagerTalk sheet. The library only grows.
          </li>
          <li>
            After a final, the stored consensus is graded as RESEARCH. That is how club ATS history
            is built. It is never copied into the issued ledger.
          </li>
          <li>
            SportsBettingDime is the primary handle feed (ticket % and money %). ScoresAndOdds and
            WagerTalk are backups. Splits persist after kick so Monday still shows Sunday's money.
          </li>
          <li>
            A row becomes a play only when a human approves it inside the 3–7 pt band with every
            hard gate green. n ≥ 30 graded issued sides is required before 75% is measurable.
          </li>
          <li>
            Read Overview → Board (slate / band / library) → matchup sheet → Quality. Digest is the
            weekly brief. Ledger stays empty until you issue.
          </li>
        </ol>
      </section>

      <p className="text-sm leading-relaxed text-subtle">{deskDigest.summary}</p>
    </div>
  );
}
