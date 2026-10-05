export function EdgeMeter({ edge, max = 15 }: { edge: number; max?: number }) {
  const e = Math.abs(edge);
  const pct = Math.min(100, (e / max) * 100);
  const tone = e >= 15 ? "bg-miss" : e >= 7 ? "bg-muted" : "bg-watch";
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-elevated"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Number(e.toFixed(1))}
      aria-label={`Model-market difference ${e.toFixed(1)} points`}
    >
      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
