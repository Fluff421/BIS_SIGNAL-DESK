import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  WATCH: "text-watch border-watch/40 bg-watch/10",
  HIGH_NOISE: "text-muted border-border bg-elevated",
  STALE_FPI: "text-miss border-miss/40 bg-miss/10",
  DATA_ISSUE: "text-miss border-miss/40 bg-miss/10",
  CANDIDATE: "text-hit border-hit/40 bg-hit/10",
  ISSUED: "text-fg border-fg/30 bg-elevated",
  GRADED: "text-muted border-border",
  LIBRARY: "text-muted border-border bg-elevated",
  ALIGNED: "text-muted border-border",
  RESEARCH: "text-watch border-watch/40 bg-watch/10",
  healthy: "text-hit border-hit/40 bg-hit/10",
  degraded: "text-watch border-watch/40 bg-watch/10",
  down: "text-miss border-miss/40 bg-miss/10",
  missing: "text-miss border-miss/40 bg-miss/10",
  provisional: "text-watch border-watch/40 bg-watch/10",
  proxy: "text-watch border-watch/40 bg-watch/10",
  verified: "text-hit border-hit/40 bg-hit/10",
  INSUFFICIENT: "text-watch border-watch/40 bg-watch/10",
  HIGH: "text-hit border-hit/40 bg-hit/10",
  MEDIUM: "text-watch border-watch/40 bg-watch/10",
  LOW: "text-muted border-border bg-elevated",
  hit: "text-hit border-hit/40 bg-hit/10",
  miss: "text-miss border-miss/40 bg-miss/10",
  push: "text-muted border-border",
};

export function ClassBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-sm border px-2 font-mono text-[11px] tracking-wide uppercase",
        STYLES[value] ?? "text-muted border-border",
        className,
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
