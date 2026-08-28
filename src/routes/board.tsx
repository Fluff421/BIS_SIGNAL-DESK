import { createFileRoute } from "@tanstack/react-router";
import { deskBoard, fmtSpread } from "@/lib/desk";

export const Route = createFileRoute("/board")({ component: BoardPage });

function BoardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl">Board</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Issued plays: none. Below is FPI versus ScoresAndOdds where both teams have a published rating.
          Edge of 3+ points is a watch, not a unit. Week 0 college and NFL Week 1 (12 days out) stay Low confidence.
        </p>
      </div>

      <section>
        <h3 className="mb-3 font-mono text-xs tracking-wide text-muted uppercase">Watch · |edge| ≥ 3</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Game</th>
                <th className="px-4 py-3 font-medium">Market home</th>
                <th className="px-4 py-3 font-medium">Model home</th>
                <th className="px-4 py-3 font-medium">Lean</th>
              </tr>
            </thead>
            <tbody>
              {deskBoard.watch.map((w) => (
                <tr key={`${w.away}-${w.home}`} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{w.away} at {w.home}</p>
                    <p className="text-xs text-muted">{w.note}</p>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{fmtSpread?.(w.marketHome) ?? w.marketHome}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{fmtSpread?.(w.modelHome) ?? w.modelHome}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-watch">{w.edgeTo} · {w.edge.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
