/** Wilson score interval for a binomial rate. n is trials excluding pushes. */

export function wilsonInterval(
  hits: number,
  n: number,
  z = 1.96,
): { lo: number; hi: number; p: number } | null {
  if (n <= 0) return null;
  const p = hits / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return {
    p,
    lo: Math.max(0, (center - margin) / denom),
    hi: Math.min(1, (center + margin) / denom),
  };
}

export function fmtPct(x: number | null | undefined, digits = 1) {
  if (x == null || Number.isNaN(x)) return "—";
  return `${(x * 100).toFixed(digits)}%`;
}

export function fmtInterval(iv: { lo: number; hi: number } | null) {
  if (!iv) return "interval unavailable (n < 30)";
  return `${fmtPct(iv.lo)}–${fmtPct(iv.hi)} (95%)`;
}
