import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { deskDigest } from "@/lib/desk";
import { ClassBadge } from "@/components/class-badge";
import { HealthStrip } from "@/components/health-strip";
import { Button } from "@/components/ui/button";
import { requestDeskBriefing } from "@/lib/briefing";

export const Route = createFileRoute("/digest")({ component: DigestPage });

function DigestPage() {
  const g = deskDigest;
  const [live, setLive] = useState<string | null>(g.aiNarrative);
  const [status, setStatus] = useState(g.narrativeStatus);
  const [model, setModel] = useState(g.narrativeModel);
  const [busy, setBusy] = useState(false);

  async function runBriefing() {
    setBusy(true);
    try {
      const r = await requestDeskBriefing();
      setLive(r.text);
      setStatus(r.narrativeStatus);
      setModel(r.narrativeModel);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="max-w-2xl">
      <h2 className="font-display text-2xl">Weekly digest</h2>
      <p className="mt-1 font-mono text-xs text-muted">
        {g.generatedAt.slice(0, 10)} · confidence {g.confidenceTier} · {model}
      </p>

      <div className="mt-6">
        <HealthStrip />
      </div>

      <section className="mt-8">
        <h3 className="font-display text-xl">ATS</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {g.atsRecord.hits}–{g.atsRecord.misses}–{g.atsRecord.pushes} (n={g.atsRecord.n}). Sample
          insufficient. Do not quote a hit rate. NCAAF and NFL remain unseparated because issued n is
          still zero in both leagues.
        </p>
      </section>

      <section className="mt-6">
        <h3 className="font-display text-xl">Helpers</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {g.helpers.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="font-display text-xl">Hurters</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {g.hurters.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl">Grok briefing</h3>
          <Button variant="outline" disabled={busy} onClick={() => void runBriefing()}>
            {busy ? "Composing…" : "Refresh briefing"}
          </Button>
        </div>
        <p className="mt-2 font-mono text-xs text-subtle uppercase">
          {status} · {model} · no xAI credits
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fg">{live ?? g.summary}</p>
      </section>

      <section className="mt-6">
        <h3 className="font-display text-xl">Top research games</h3>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
          {g.topGamesNextWeek.map((t) => (
            <li key={t.matchup} className="px-4 py-3">
              <p className="text-sm font-medium">{t.matchup}</p>
              <p className="text-sm text-muted">
                {t.league} · {t.kick} · {t.edgeTo} {Number(t.edge).toFixed(1)} · {t.confidence} —
                research only
              </p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-sm text-subtle">
        Model change this week: none. Rollback is restore the prior model.json plus matching
        board-history snapshot.
      </p>
      <ClassBadge value={g.confidenceTier} className="mt-4" />
    </article>
  );
}
