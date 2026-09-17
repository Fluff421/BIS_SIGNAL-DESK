import { deskHealth } from "@/lib/desk";
import { ClassBadge } from "@/components/class-badge";

const ITEMS = [
  ["Odds", deskHealth.odds.status],
  ["CFBD", deskHealth.cfbd.status],
  ["ESPN", deskHealth.espn.status],
  ["Grok", deskHealth.grok.status],
  ["AN", deskHealth.actionnetwork?.status ?? "degraded"],
  ["SBD", deskHealth.sportsbettingdime?.status ?? "degraded"],
  ["SAO", deskHealth.scoresandodds?.status ?? "degraded"],
  ["WT", deskHealth.wagertalk?.status ?? "degraded"],
] as const;

export function HealthStrip() {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {ITEMS.map(([k, v]) => (
        <li key={k} className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-surface px-3">
          <span className="font-mono text-xs tracking-wide text-muted uppercase">{k}</span>
          <ClassBadge value={v} />
        </li>
      ))}
    </ul>
  );
}