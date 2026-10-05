import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { deskModel, deskBacktest, deskCalibration, deskHistorySample, prettyTeamId } from "@/lib/desk";
import { wilsonInterval, fmtPct } from "@/lib/stats";

export const Route = createFileRoute("/model")({ component: ModelPage });

function ModelPage() {
  const w = deskModel.ensembleSpec.weights;
  const buckets = deskBacktest.byBucket.map((b) => {
    const iv = wilsonInterval(b.hits, b.hits + b.misses);
    return { ...b, lo: iv?.lo ?? 0, hi: iv?.hi ?? 0, atsPct: b.ats * 100 };
  });
  const reliability = deskCalibration.reliability.map((r) => ({
    ...r,
    stated: r.p,
    observed: r.observed,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl">Model</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Version {deskModel.version}. {deskModel.engine} Training window 2021–2024, holdout 2025.
          NCAAF and NFL stay separate; this report is NCAAF regular season only.
        </p>
      </div>

      <section className="rounded-xl bg-surface p-5">
        <h3 className="font-display text-xl">Spread engine (benchmark)</h3>
        <p className="mt-3 font-mono text-sm text-fg">{deskModel.formula}</p>
        <p className="mt-3 text-sm text-muted">
          NCAAF HFA {deskModel.hfa.ncaaf} · NFL HFA {deskModel.hfa.nfl} · Neutral {deskModel.hfa.neutral}.
          Watch at {deskModel.watchThreshold} pts. {deskModel.playThreshold}
        </p>
      </section>

      <section className="rounded-xl border border-border p-5">
        <h3 className="font-display text-xl">Historical bucket ATS (NCAAF 2021–2025)</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{deskBacktest.conclusion}</p>
        <div className="mt-6 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets}>
              <CartesianGrid stroke="rgba(244,244,245,0.08)" vertical={false} />
              <XAxis dataKey="band" stroke="#a1a1aa" fontSize={12} />
              <YAxis domain={[20, 70]} stroke="#a1a1aa" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#121214", border: "1px solid rgba(244,244,245,0.12)", color: "#f4f4f5" }}
                formatter={(v: number) => [`${Number(v).toFixed(1)}%`, "ATS"]}
              />
              <Bar dataKey="atsPct" fill="#c4b08a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 font-mono text-sm tabular-nums">
          {buckets.map((b) => (
            <li key={b.band} className="flex justify-between border-b border-border py-2">
              <span className="text-muted">
                {b.band} n={b.n}
              </span>
              <span>
                {fmtPct(b.ats)} · {fmtPct(b.lo)}–{fmtPct(b.hi)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-subtle">
          Holdout 2025 ATS {fmtPct(deskBacktest.holdout2025.ats)} (n={deskBacktest.holdout2025.n}).
          Overall {fmtPct(deskBacktest.overall.ats)} n={deskBacktest.overall.n}. Not a 75% claim.
        </p>
      </section>

      <section className="rounded-xl border border-border p-5">
        <h3 className="font-display text-xl">Reliability (illustrative)</h3>
        <p className="mt-2 text-sm text-muted">{deskCalibration.note}</p>
        <div className="mt-6 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={reliability}>
              <CartesianGrid stroke="rgba(244,244,245,0.08)" />
              <XAxis dataKey="p" stroke="#a1a1aa" fontSize={12} />
              <YAxis domain={[0.3, 0.7]} stroke="#a1a1aa" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#121214", border: "1px solid rgba(244,244,245,0.12)", color: "#f4f4f5" }}
              />
              <Line type="monotone" dataKey="stated" stroke="#a1a1aa" dot={false} name="stated p" />
              <Line type="monotone" dataKey="observed" stroke="#c4b08a" name="observed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-border p-5">
        <h3 className="font-display text-xl">BIM ensemble (spec, live weight = 0)</h3>
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
          Fitted on 2026: {deskModel.ensembleSpec.fittedOn2026 ? "yes" : "no"}. Weights stay unused
          until n≥30 graded issued sides and a holdout supports a change.
        </p>
      </section>

      <section>
        <h3 className="mb-3 font-mono text-xs tracking-wide text-muted uppercase">
          Historical schema sample
        </h3>
        {deskHistorySample.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-6 text-sm text-muted">
            No 2024 game tape is checked in. The desk will not invent scores or closes to fill this
            panel.
          </p>
        ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {deskHistorySample.map((g) => (
            <li key={String(g.gameId)} className="px-4 py-3 text-sm">
              <p className="font-medium">
                {prettyTeamId(String(g.away))} @ {prettyTeamId(String(g.home))} · week {String(g.week)}
              </p>
              <p className="font-mono text-xs text-subtle">
                model {String(g.modelHomeMargin)} · close {String(g.marketCloseHome)} · actual{" "}
                {String(g.actualMargin)} · no post-game ratings
              </p>
            </li>
          ))}
        </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-mono text-xs tracking-wide text-muted uppercase">Changelog / rollback</h3>
        <ul className="space-y-3">
          {deskModel.changelog.map((c) => (
            <li key={c.date + c.change.slice(0, 12)} className="rounded-xl bg-surface p-4">
              <p className="font-mono text-xs text-muted">{c.date}</p>
              <p className="mt-1 text-sm leading-relaxed">{c.change}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-subtle">
          Rollback: restore the prior model.json version and the matching board-history snapshot.
          Never overwrite silently.
        </p>
      </section>
    </div>
  );
}
