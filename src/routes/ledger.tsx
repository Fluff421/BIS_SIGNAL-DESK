import { createFileRoute } from "@tanstack/react-router";
import { deskLedger } from "@/lib/desk";

export const Route = createFileRoute("/ledger")({ component: LedgerPage });

function LedgerPage() {
  const books = [
    { label: "ATS", book: deskLedger.regular.ats },
    { label: "Moneyline", book: deskLedger.regular.ml },
    { label: "Totals", book: deskLedger.regular.totals },
  ];
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl">Ledger</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Graded regular-season sides only. Preseason and Week 0 mismatches are excluded from the 75% ATS target.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {books.map(({ label, book }) => (
          <div key={label} className="rounded-xl bg-surface p-5">
            <p className="font-mono text-xs text-muted uppercase">{label}</p>
            <p className="mt-2 font-display text-3xl tabular-nums">
              {book.hits}–{book.misses}–{book.pushes}
            </p>
            <p className="mt-1 text-sm text-subtle">n = {book.n} · rate —</p>
          </div>
        ))}
      </div>

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
        <p className="mt-4 text-sm text-subtle">{deskLedger.githubAttempt}</p>
      </section>

      <section>
        <h3 className="mb-3 font-mono text-xs tracking-wide text-muted uppercase">Graded rows</h3>
        <div className="rounded-xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          None. No 2026 regular-season game we handicapped is final.
        </div>
      </section>
    </div>
  );
}
