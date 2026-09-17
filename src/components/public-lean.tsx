import type { PublicLean } from "@/lib/desk";

function clampPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function SplitBar({
  away,
  label,
}: {
  away: number | null;
  label: string;
}) {
  const pct = clampPct(away);
  if (pct == null) {
    return (
      <div>
        <div className="flex items-center justify-between gap-2 font-mono text-xs text-subtle">
          <span>{label}</span>
          <span>not on file</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-elevated" />
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-2 font-mono text-xs text-muted">
        <span>Away {pct}%</span>
        <span>{label}</span>
        <span>Home {100 - pct}%</span>
      </div>
      <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-elevated">
        <div className="bg-watch" style={{ width: `${pct}%` }} />
        <div className="bg-muted" style={{ width: `${100 - pct}%` }} />
      </div>
    </div>
  );
}

export function PublicLeanCard({ lean }: { lean?: PublicLean | null }) {
  if (!lean) {
    return <p className="text-sm text-muted">Public lean not on file.</p>;
  }
  const div = lean.divergence;
  const sharpish = div != null && Math.abs(div) >= 10;
  return (
    <div className="flex flex-col gap-3">
      <SplitBar away={lean.betsAway} label="tickets" />
      <SplitBar away={lean.moneyAway} label="money" />
      {lean.overBets != null || lean.overMoney != null ? (
        <SplitBar away={lean.overBets ?? null} label="over tickets" />
      ) : null}
      {lean.overMoney != null ? <SplitBar away={lean.overMoney} label="over money" /> : null}
      <p className="font-mono text-xs text-subtle">
        {lean.tickets != null ? `${lean.tickets.toLocaleString()} tickets` : "volume —"}
        {div != null ? ` · money−tickets ${div > 0 ? "+" : ""}${div}` : ""}
        {lean.moneySource ? ` · money via ${lean.moneySource}` : ""}
      </p>
      {sharpish ? (
        <p className="text-xs leading-relaxed text-watch">
          Handle and tickets disagree by {Math.abs(div ?? 0)} pts on the away side. Research flag
          only — not a ticket.
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-muted">
        Tickets: SportsBettingDime when present, else AN, ScoresAndOdds, WagerTalk, SBR picks, or
        Covers contest. Money: SportsBettingDime handle share, else ScoresAndOdds, WagerTalk, AN
        featured, else last persisted snapshot.
        {lean.sbrAway != null ? ` SBR ${lean.sbrAway}/${lean.sbrHome}.` : ""}
        {lean.coversAway != null ? ` Covers ${lean.coversAway}/${lean.coversHome}.` : ""}
      </p>
    </div>
  );
}
