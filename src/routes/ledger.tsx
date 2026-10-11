import { createFileRoute } from "@tanstack/react-router";
import { deskLedger, deskModel, deskResearch, fmtKickLong } from "@/lib/desk";
import { wilsonInterval, fmtInterval } from "@/lib/stats";
import { ClassBadge } from "@/components/class-badge";

export const Route = createFileRoute("/ledger")({ component: LedgerPage });

function LedgerPage() {
  const books = [
    { label: "ATS", book: deskLedger.regular.ats },
    { label: "Moneyline", book: deskLedger.regular.ml },
    { label: "Totals", book: deskLedger.regular.totals },
  ];
  const toward = deskLedger.target.minN;
  const n = deskLedger.regular.ats.n;
  const pct = Math.min(100, (n / toward) * 100);
  const researchRows = deskResearch.rows ?? [];
  const openPlays = deskLedger.open ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl">Ledger</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Only issued, then graded, entries live in the official books. Research grades sit in a
          separate tape so a large library cannot be mistaken for a 75% issued record.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {books.map(({ label, book }) => {
          const iv = wilsonInterval(book.hits, book.hits + book.misses);
          return (
            <div key={label} className="rounded-xl bg-surface p-5">
              <p className="font-mono text-xs text-muted uppercase">{label} issued</p>
              <p className="mt-2 font-display text-3xl tabular-nums">
                {book.hits}–{book.misses}–{book.pushes}
              </p>
              <p className="mt-1 text-sm text-subtle">
                n = {book.n} · rate {book.rate ?? "—"}
              </p>
              <p className="mt-2 text-sm text-subtle">{fmtInterval(n >= 30 ? iv : null)}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-border p-5">
        <h3 className="font-display text-xl">Sample toward measurability</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{deskLedger.target.status}</p>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-elevated"
          role="progressbar"
          aria-valuenow={n}
          aria-valuemin={0}
          aria-valuemax={toward}
          aria-label="Graded issued sides toward n=30"
        >
          <div className="h-full bg-watch" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 font-mono text-xs text-subtle">
          {n} / {toward} graded issued sides · play threshold: {deskModel.playThreshold}
        </p>
      </section>

      <section>
        <h3 className="mb-3 font-display text-xl">Open issued plays</h3>
        {openPlays.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-6 text-sm text-muted">
            None yet. Issuing a watched game writes it here before the final. It does not change the 0–0–0 issued ATS.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {openPlays.map((r) => (
              <li key={r.eventId || `${r.kick}-${r.home}`} className="px-4 py-3">
                <p className="text-sm">
                  {r.away} @ {r.home}
                </p>
                <p className="mt-1 font-mono text-[11px] text-subtle">
                  Play: {r.sideTeam || r.approvedSide} · {r.league} · {r.kick ? fmtKickLong(r.kick) : ""} · {r.result || "OPEN"}
                </p>
                {r.issueNote ? <p className="mt-1 text-sm text-muted">{r.issueNote}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-mono text-xs tracking-wide text-muted uppercase">Issued & graded rows</h3>
        {deskLedger.graded.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-10 text-center">
            <p className="text-sm text-muted">
              Empty. No 2026 regular-season side has been issued, so nothing can be graded. Final
              scores will not backfill this table from watch rows.
            </p>
            <p className="mt-3 text-sm text-subtle">
              When a play is issued it will store: observed line, timestamp, books, model version,
              data version, human reviewer. Result: WIN / LOSS / PUSH plus closing-line value.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {(deskLedger.graded as Array<Record<string, unknown>>).map((r) => (
              <li
                key={String(r.game_id || `${r.kick}-${r.away}-${r.home}`)}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm">
                    {String(r.away)} @ {String(r.home)}
                  </p>
                  <p className="font-mono text-[11px] text-subtle">
                    {String(r.league)} · {fmtKickLong(String(r.kick))} · side {String(r.edgeTo)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ClassBadge value={String(r.result)} />
                  <ClassBadge value="ISSUED" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-xl">Research tape</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              {deskResearch.policy}
            </p>
          </div>
          <p className="font-mono text-xs text-subtle">
            {deskResearch.ats.hits}–{deskResearch.ats.misses}–{deskResearch.ats.pushes} n=
            {deskResearch.ats.n}
          </p>
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {researchRows.slice(0, 24).map((r) => (
            <li
              key={`${r.league}-${r.kick}-${r.away}-${r.home}`}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm">
                  {r.away} @ {r.home}
                </p>
                <p className="font-mono text-[11px] text-subtle">
                  {r.league} · {fmtKickLong(r.kick)} · side {r.side}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ClassBadge value={r.result} />
                <ClassBadge value={r.class ?? "RESEARCH"} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 font-mono text-xs text-subtle">
          Showing {Math.min(24, researchRows.length)} of {researchRows.length}. Clean-band{" "}
          {deskResearch.cleanBand
            ? `${deskResearch.cleanBand.hits}–${deskResearch.cleanBand.misses}–${deskResearch.cleanBand.pushes} (n=${deskResearch.cleanBand.n})`
            : "—"}
          .
        </p>
      </section>

      <section className="rounded-xl border border-border p-5">
        <h3 className="font-display text-xl">Prior logs searched</h3>
        <ul className="mt-4 space-y-3">
          {deskLedger.priorLogs.map((p) => (
            <li key={p.place}>
              <p className="text-sm font-medium">{p.place}</p>
              <p className="text-sm text-muted">{p.found}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
