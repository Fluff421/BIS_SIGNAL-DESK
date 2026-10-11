import { useEffect, useState } from "react";
import { ClassBadge } from "@/components/class-badge";
import { TeamMark } from "@/components/team-mark";
import { EdgeMeter } from "@/components/edge-meter";
import { Button } from "@/components/ui/button";
import { PublicLeanCard } from "@/components/public-lean";
import {
  fmtKickLong,
  fmtSpread,
  gateForRow,
  espnForMatchup,
  qbHeadline,
  weatherFor,
  travelFor,
  teamIntelFor,
  type WatchRow,
} from "@/lib/desk";
import { kickMs } from "@/lib/gates";
import { issueWatchedPlay } from "@/lib/issue-desk";

function unknown(v: unknown) {
  if (v == null || v === "") return "unknown";
  return String(v);
}

export function MatchupSheet({
  row,
  onClose,
  issued = false,
  onIssued,
}: {
  row: WatchRow;
  onClose: () => void;
  issued?: boolean;
  onIssued?: (row: WatchRow) => void;
}) {
  const gate = gateForRow(row);
  const wx = weatherFor(row.home);
  const trip = travelFor(row.home, row.away);
  const awayIntel = teamIntelFor(row.away);
  const homeIntel = teamIntelFor(row.home);
  const live = espnForMatchup(row.home, row.away);
  const kick = kickMs(row.kick);
  const future = kick != null && kick > Date.now();
  const canClick = gate.allHardGreen && future && !issued;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ team: string; matchup: string } | null>(null);
  const eventId = row.eventId || "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function choose(side: "home" | "away") {
    if (!canClick || !note.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await issueWatchedPlay({
        data: { event: eventId, side, note: note.trim() },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone({ team: result.team, matchup: result.matchup });
      onIssued?.({
        ...row,
        dataClass: "ISSUED",
        approvedSide: result.side,
        sideTeam: result.team,
        issueNote: note.trim(),
      } as WatchRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue this play.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-0 sm:items-center sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="matchup-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-border bg-surface p-5 sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-wide text-muted uppercase">
              {row.league} · {fmtKickLong(row.kick)}
              {issued ? " · Issued" : ""}
              {row.completed ? " · Final" : ""}
            </p>
            <h2 id="matchup-title" className="mt-1 font-display text-xl">
              {row.away} {row.neutral ? "vs" : "@"} {row.home}
            </h2>
          </div>
          <ClassBadge value={issued ? "ISSUED" : (row.dataClass ?? "WATCH")} />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <TeamMark name={row.away} />
          <div className="min-w-0 flex-1">
            <EdgeMeter edge={row.edge} />
            <p className="mt-1 font-mono text-xs text-subtle">
              Difference {Number(row.edge).toFixed(1)} toward {row.edgeTo}
            </p>
          </div>
          <TeamMark name={row.home} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="font-mono text-[11px] text-subtle uppercase">Consensus</dt>
            <dd className="font-mono tabular-nums">{fmtSpread(row.marketHome)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] text-subtle uppercase">Model</dt>
            <dd className="font-mono tabular-nums">{fmtSpread(row.modelHome)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] text-subtle uppercase">Total</dt>
            <dd className="font-mono tabular-nums">{row.total ?? "unknown"}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] text-subtle uppercase">Books</dt>
            <dd className="font-mono tabular-nums">{row.nBooks ?? "unknown"}</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-lg border border-border bg-elevated px-3 py-3">
          <p className="font-mono text-[10px] tracking-wide text-subtle uppercase">Public lean</p>
          <div className="mt-2">
            <PublicLeanCard lean={row.publicBetting} />
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="font-mono text-[10px] tracking-wide text-subtle uppercase">Quarterbacks</dt>
            <dd className="mt-1 text-muted">
              {row.away}: {qbHeadline(row.away)}
              <br />
              {row.home}: {qbHeadline(row.home)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] tracking-wide text-subtle uppercase">Kickoff weather</dt>
            <dd className="mt-1 text-muted">
              {wx && wx.temp != null
                ? `${unknown(wx.forecast)} ${wx.temp}°${wx.unit ?? ""} · wind ${unknown(wx.wind)}`
                : "unknown"}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] tracking-wide text-subtle uppercase">Rest / travel</dt>
            <dd className="mt-1 text-muted">
              {trip
                ? `${trip.travelMilesAway != null ? `${trip.travelMilesAway} mi` : "unknown miles"} · ${trip.restNote}`
                : "unknown"}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] tracking-wide text-subtle uppercase">Club library</dt>
            <dd className="mt-1 text-muted">
              {row.away}:{" "}
              {awayIntel
                ? `${awayIntel.hits}–${awayIntel.misses}–${awayIntel.pushes} research (n=${awayIntel.n})`
                : "unknown"}
              <br />
              {row.home}:{" "}
              {homeIntel
                ? `${homeIntel.hits}–${homeIntel.misses}–${homeIntel.pushes} research (n=${homeIntel.n})`
                : "unknown"}
            </dd>
          </div>
          {live ? (
            <div>
              <dt className="font-mono text-[10px] tracking-wide text-subtle uppercase">ESPN stamp</dt>
              <dd className="mt-1 text-muted">
                {live.status}
                {live.completed ? ` · ${live.awayPoints}–${live.homePoints}` : ""}
              </dd>
            </div>
          ) : null}
        </dl>

        <h3 className="mt-6 font-mono text-xs tracking-wide text-muted uppercase">Issuance gates</h3>
        <p className="mt-1 text-sm text-subtle">
          {gate.gates.filter((g) => g.status === "pass").length}/{gate.gates.length} hard gates pass.
          75% discussable: {gate.quote75Allowed ? "yes" : "no (reporting only, does not block issue 1)"}.
        </p>
        <ul className="mt-3 space-y-2">
          {gate.gates.map((g) => (
            <li key={g.id} className="flex items-start justify-between gap-3 text-sm">
              <span>
                <span className={g.status === "pass" ? "text-fg" : "text-muted"}>{g.label}</span>
                <span className="mt-0.5 block text-xs text-subtle">{g.reason}</span>
              </span>
              <span
                className={`shrink-0 font-mono text-[11px] uppercase ${
                  g.status === "pass" ? "text-hit" : g.status === "fail" ? "text-miss" : "text-watch"
                }`}
              >
                {g.status}
              </span>
            </li>
          ))}
        </ul>

        {issued || done ? (
          <p className="mt-5 rounded-lg bg-elevated px-3 py-3 text-sm text-fg">
            Issued play{done ? `: ${done.team}` : ""}. {done ? `${done.matchup} moved from watched to the Issued band and the open ledger.` : "This card is no longer a watched candidate."} Issued ATS stays 0–0–0 until the game is graded.
          </p>
        ) : (
          <section className="mt-5 rounded-lg border border-border bg-elevated p-4">
            <h3 className="font-display text-lg">Issue this watched game</h3>
            <p className="mt-1 text-sm text-muted">
              {row.away} at {row.home}. A tap writes the side onto the issued board and the open ledger. It is not graded yet.
            </p>
            <label className="mt-3 block text-sm">
              Note (required)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Why this side, before kickoff"
                className="mt-1 min-h-11 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-fg"
              />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                disabled={!canClick || !note.trim() || busy}
                onClick={() => choose("away")}
              >
                {busy ? "Issuing…" : `Issue ${row.away}`}
              </Button>
              <Button
                disabled={!canClick || !note.trim() || busy}
                onClick={() => choose("home")}
              >
                {busy ? "Issuing…" : `Issue ${row.home}`}
              </Button>
            </div>
            {!canClick ? (
              <p className="mt-3 text-sm text-muted">
                Issue stays off until every hard gate is green and kickoff is still ahead. n ≥ 30 does not block the first play.
              </p>
            ) : (
              <p className="mt-3 text-sm text-subtle">Watched, and ready. Pick the club you are approving.</p>
            )}
            {error ? <p className="mt-3 text-sm text-miss">{error}</p> : null}
          </section>
        )}

        <Button variant="outline" className="mt-4 w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
