import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { deskBoard, fmtKickLong, fmtSpread, publicLeanLine, type WatchRow } from "@/lib/desk";
import { ClassBadge } from "@/components/class-badge";
import { Button } from "@/components/ui/button";
import { TeamMark } from "@/components/team-mark";
import { EdgeMeter } from "@/components/edge-meter";
import { MatchupSheet } from "@/components/matchup-sheet";

export const Route = createFileRoute("/board")({ component: BoardPage });

function RowCard({ w, onOpen }: { w: WatchRow; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-border bg-surface p-4 text-left transition-colors duration-150 hover:bg-elevated"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <TeamMark name={w.away} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {w.away} {w.neutral ? "vs" : "@"} {w.home}
            </p>
            <p className="mt-1 text-sm text-muted">
              {w.league} · {fmtKickLong(w.kick)}
              {w.neutral ? " · Neutral" : ""}
              {w.completed ? " · Final" : ""}
            </p>
          </div>
        </div>
        <ClassBadge value={w.dataClass ?? w.confidence ?? "WATCH"} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="font-mono text-[11px] text-subtle uppercase">Consensus</dt>
          <dd className="font-mono tabular-nums">{fmtSpread(w.marketHome)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] text-subtle uppercase">Model</dt>
          <dd className="font-mono tabular-nums">{fmtSpread(w.modelHome)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] text-subtle uppercase">Difference</dt>
          <dd className="font-mono tabular-nums text-watch">{Number(w.edge).toFixed(1)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] text-subtle uppercase">Lean</dt>
          <dd className="truncate">{w.edgeTo}</dd>
        </div>
      </dl>
      <div className="mt-3">
        <EdgeMeter edge={w.edge} />
      </div>
      <p className="mt-3 font-mono text-[11px] text-subtle">
        {w.nBooks ?? 0} books · σ {w.spreadStddev ?? "—"} · move {w.lineMovement ?? 0} · total {w.total ?? "—"}
        {w.lowLiquidity ? " · low liquidity" : ""}
      </p>
      <p className="mt-1 font-mono text-[11px] text-muted">{publicLeanLine(w.publicBetting)}</p>
      <p className="mt-2 text-xs text-subtle">Open for gate audit. Not an issued play.</p>
    </button>
  );
}

function BoardPage() {
  const [band, setBand] = useState<"slate" | "watch" | "library">("slate");
  const [hideStale, setHideStale] = useState(true);
  const [hideNoise, setHideNoise] = useState(true);
  const [league, setLeague] = useState<"ALL" | "NCAAF" | "NFL">("ALL");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"edge" | "kick" | "books">("kick");
  const [open, setOpen] = useState<WatchRow | null>(null);

  const rows = useMemo(() => {
    let list: WatchRow[] = [];
    if (band === "watch") list = [...deskBoard.watch];
    else if (band === "library") list = [...(deskBoard.library ?? [])];
    else {
      list = [...(deskBoard.observe ?? deskBoard.watch)];
      if (hideNoise) list = list.filter((r) => r.dataClass !== "HIGH_NOISE");
      if (hideStale) list = list.filter((r) => r.dataClass !== "STALE_FPI");
    }
    if (band === "library") {
      if (hideNoise) list = list.filter((r) => r.dataClass !== "HIGH_NOISE" || r.completed);
      if (hideStale) list = list.filter((r) => r.dataClass !== "STALE_FPI" || r.completed);
    }
    if (league !== "ALL") list = list.filter((r) => r.league === league);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (r) =>
          r.home.toLowerCase().includes(needle) ||
          r.away.toLowerCase().includes(needle) ||
          r.edgeTo.toLowerCase().includes(needle),
      );
    }
    return list.sort((a, b) => {
      if (sort === "kick") return a.kick.localeCompare(b.kick) || Number(b.edge) - Number(a.edge);
      if (sort === "books") return (b.nBooks ?? 0) - (a.nBooks ?? 0);
      return Number(b.edge) - Number(a.edge);
    });
  }, [band, hideStale, hideNoise, league, q, sort]);

  const groups = useMemo(() => {
    const map = new Map<string, WatchRow[]>();
    for (const r of rows) {
      const k = r.kick.slice(0, 10);
      const arr = map.get(k) ?? [];
      arr.push(r);
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [rows]);

  const c = deskBoard.counts;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl">Board</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Issued plays: none. The research slate is every posted NFL and NCAAF game with a line —
          {c.observe} upcoming across {c.teamsCovered} clubs. The 3–7 pt band stays the only issuance
          candidate set. Watching more games builds the library ({c.library} on file, {c.completed}{" "}
          finals); it does not mint tickets.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="block">
          <span className="sr-only">Search teams</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search team"
            className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-subtle"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["slate", `Research slate (${c.observe})`],
              ["watch", `Issuance band (${c.watch})`],
              ["library", `Recent finals (${deskBoard.library?.length ?? 0})`],
            ] as const
          ).map(([id, label]) => (
            <Button key={id} variant={band === id ? "primary" : "outline"} onClick={() => setBand(id)}>
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={hideStale ? "primary" : "outline"} onClick={() => setHideStale((v) => !v)}>
            {hideStale ? "Stale hidden" : "Showing stale"} ({c.staleFpi})
          </Button>
          <Button variant={hideNoise ? "primary" : "outline"} onClick={() => setHideNoise((v) => !v)}>
            {hideNoise ? "Noise hidden" : "Showing noise"} ({c.highNoise})
          </Button>
          {(["ALL", "NCAAF", "NFL"] as const).map((l) => (
            <Button key={l} variant={league === l ? "primary" : "ghost"} onClick={() => setLeague(l)}>
              {l}
            </Button>
          ))}
          {(["kick", "edge", "books"] as const).map((s) => (
            <Button key={s} variant={sort === s ? "outline" : "ghost"} onClick={() => setSort(s)}>
              Sort {s}
            </Button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-12 text-center text-sm text-muted">
          No rows in this filter. That is expected when diagnostics are hidden and the watch band is
          empty.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(([day, list]) => (
            <section key={day}>
              <h3 className="mb-3 font-mono text-xs tracking-wide text-muted uppercase">
                {fmtKickLong(day)} · {list.length}
              </h3>
              <div className="grid gap-3">
                {list.map((w) => (
                  <RowCard
                    key={w.eventId ?? `${w.away}-${w.home}-${w.kick}`}
                    w={w}
                    onOpen={() => setOpen(w)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <section>
        <h3 className="mb-3 font-mono text-xs tracking-wide text-muted uppercase">Aligned · no play</h3>
        {deskBoard.aligned.length === 0 ? (
          <p className="text-sm text-muted">No aligned rows in this snapshot.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {deskBoard.aligned.slice(0, 12).map((g) => (
              <li
                key={`${g.away}-${g.home}`}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between"
              >
                <span>
                  {g.away} at {g.home}
                  {g.note ? <span className="text-subtle"> · {g.note}</span> : null}
                </span>
                <span className="font-mono text-sm tabular-nums text-muted">
                  mkt {fmtSpread(g.marketHome)} · model {fmtSpread(g.modelHome)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open ? <MatchupSheet row={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
