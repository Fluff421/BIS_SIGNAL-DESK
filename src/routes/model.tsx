import { createFileRoute } from "@tanstack/react-router";
import { deskModel } from "@/lib/desk";

export const Route = createFileRoute("/model")({ component: ModelPage });

function ModelPage() {
  const w = deskModel.ensembleSpec.weights;
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl">Model</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{deskModel.engine}</p>
      </div>

      <section className="rounded-xl bg-surface p-5">
        <h3 className="font-display text-xl">Spread engine</h3>
        <p className="mt-3 font-mono text-sm text-fg">{deskModel.formula}</p>
        <p className="mt-3 text-sm text-muted">
          NCAAF HFA {deskModel.hfa.ncaaf} · NFL HFA {deskModel.hfa.nfl} · Neutral {deskModel.hfa.neutral}.
          Watch at {deskModel.watchThreshold} points. {deskModel.playThreshold}
        </p>
      </section>

      <section className="rounded-xl border border-border p-5">
        <h3 className="font-display text-xl">BIM ensemble (spec, not fitted)</h3>
        <p className="mt-2 text-sm text-muted">{deskModel.ensembleSpec.source}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 font-mono text-sm tabular-nums">
          {Object.entries(w).map(([k, v]) => (
            <li key={k} className="flex justify-between border-b border-border py-2">
              <span className="text-muted">{k}</span>
              <span>{v}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-subtle">
          Fitted on 2026: {deskModel.ensembleSpec.fittedOn2026 ? "yes" : "no"}. Live weight is zero.
        </p>
      </section>

      <section>
        <h3 className="mb-3 font-mono text-xs tracking-wide text-muted uppercase">Changelog</h3>
        <ul className="space-y-3">
          {deskModel.changelog.map((c) => (
            <li key={c.date} className="rounded-xl bg-surface p-4">
              <p className="font-mono text-xs text-muted">{c.date}</p>
              <p className="mt-1 text-sm">{c.change}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
