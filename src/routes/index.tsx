import { createFileRoute, Link } from "@tanstack/react-router";
import { deskLedger, deskSnapshot, deskBoard, deskModel } from "@/lib/desk";

export const Route = createFileRoute("/")({ component: Home });

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-surface p-5 pt-5">
      <p className="font-mono text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-subtle">{hint}</p>
    </div>
  );
}

function Home() {
  const ats = deskLedger.regular.ats;
  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <p className="font-mono text-xs tracking-wide text-watch uppercase">Calendar honesty</p>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-fg">
          {deskSnapshot.honesty} {deskSnapshot.calendar.ncaaf} {deskSnapshot.calendar.nfl}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="ATS (regular)"
          value={`${ats.hits}–${ats.misses}–${ats.pushes}`}
          hint="n = 0. 75% target not measurable until 30 graded sides."
        />
        <Stat
          label="Issued plays"
          value={String(deskBoard.issuedPlays.length)}
          hint="Empty card. Watch list is research, not a bet."
        />
        <Stat
          label="Engine"
          value="FPI + HFA"
          hint={deskModel.engine}
        />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl">Watch list</h2>
          <Link to="/board" className="text-sm text-muted hover:text-fg">
            Full board
          </Link>
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {deskBoard.watch.slice(0, 5).map((w) => (
            <li key={`${w.away}-${w.home}`} className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {w.away} at {w.home}
                </p>
                <p className="text-sm text-muted">{w.note}</p>
              </div>
              <p className="font-mono text-sm tabular-nums text-watch">
                {w.edgeTo} · {w.edge.toFixed(1)} pts
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface p-5">
          <h2 className="font-display text-xl">NCAAF FPI top 8</h2>
          <ol className="mt-4 space-y-2 font-mono text-sm tabular-nums">
            {deskSnapshot.ncaafFpi.slice(0, 8).map((t) => (
              <li key={t.team} className="flex justify-between">
                <span className="text-muted">
                  {t.rank}. {t.team}
                </span>
                <span>{t.fpi.toFixed(1)}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <h2 className="font-display text-xl">NFL FPI top 8</h2>
          <p className="mt-1 text-sm text-subtle">Projected wins still 0-0-0 (preseason).</p>
          <ol className="mt-4 space-y-2 font-mono text-sm tabular-nums">
            {deskSnapshot.nflFpi.slice(0, 8).map((t) => (
              <li key={t.team} className="flex justify-between">
                <span className="text-muted">
                  {t.rank}. {t.team}
                </span>
                <span>{t.fpi > 0 ? "+" : ""}{t.fpi.toFixed(1)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
