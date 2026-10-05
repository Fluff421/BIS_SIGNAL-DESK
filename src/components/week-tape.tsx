import { deskBoard, fmtKickLong, fmtSpread, type WatchRow } from "@/lib/desk";
import { TeamMark } from "@/components/team-mark";

export function WeekTape({ rows }: { rows: WatchRow[] }) {
  const days = [...new Set(rows.map((r) => r.kick.slice(0, 10)))].sort();
  if (!days.length) {
    return <p className="text-sm text-muted">No research rows on the tape.</p>;
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {days.map((d) => {
        const list = rows.filter((r) => r.kick.startsWith(d));
        return (
          <section
            key={d}
            className="min-w-[220px] shrink-0 rounded-lg border border-border bg-surface p-3"
          >
            <p className="font-mono text-[11px] tracking-wide text-subtle uppercase">
              {fmtKickLong(d)} · {list.length}
            </p>
            <ul className="mt-2 space-y-2">
              {list.slice(0, 8).map((r) => (
                <li key={r.eventId ?? `${r.away}-${r.home}`} className="flex items-center gap-2">
                  <TeamMark name={r.home} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {r.away.split(" ").slice(-1)} @ {r.home.split(" ").slice(-1)}
                    </p>
                    <p className="font-mono text-[11px] text-subtle">
                      {r.league} · {fmtSpread(r.marketHome)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <section className="min-w-[180px] shrink-0 rounded-lg border border-dashed border-border p-3">
        <p className="font-mono text-[11px] text-subtle uppercase">Suppressed</p>
        <p className="mt-2 font-display text-2xl tabular-nums">{deskBoard.counts.staleFpi}</p>
        <p className="text-xs text-muted">STALE_FPI off the tape</p>
        <p className="mt-3 font-display text-2xl tabular-nums">{deskBoard.counts.highNoise}</p>
        <p className="text-xs text-muted">HIGH_NOISE off the tape</p>
      </section>
    </div>
  );
}
