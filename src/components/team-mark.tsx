import { teamAbbr } from "@/lib/desk";
import { cn } from "@/lib/utils";

const TONES = ["text-fg", "text-muted", "text-watch", "text-primary", "text-subtle"] as const;

function tone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

export function TeamMark({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const abbr = teamAbbr(name);
  const dim = size === "sm" ? "h-8 w-8 text-[10px]" : "h-11 w-11 text-xs";
  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm border border-border bg-elevated font-mono font-medium tracking-wide",
        dim,
        tone(name),
      )}
    >
      {abbr}
    </span>
  );
}
