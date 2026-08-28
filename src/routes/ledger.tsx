import { createFileRoute } from "@tanstack/react-router";
import { deskLedger } from "@/lib/desk";

export const Route = createFileRoute("/ledger")({ component: LedgerPage });

function LedgerPage() {
  const ats = deskLedger.regular.ats;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl">Ledger</h2>
        <p className="mt-2 text-sm text-muted">ATS tracking for graded sides.</p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="font-mono text-xs uppercase text-muted">Regular season ATS</p>
        <p className="mt-2 font-display text-3xl tabular-nums">{ats.hits}–{ats.misses}–{ats.pushes}</p>
        <p className="mt-2 text-sm text-subtle">Target 75% after 30 graded sides.</p>
      </div>
    </div>
  );
}
