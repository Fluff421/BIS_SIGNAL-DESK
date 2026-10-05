import { cn } from "@/lib/utils";

const STEPS = [
  { id: "obs", label: "Observation", hint: "Market line stored" },
  { id: "model", label: "Model", hint: "FPI + HFA margin" },
  { id: "research", label: "Research", hint: "WATCH band" },
  { id: "validated", label: "Validated", hint: "Gates + backtest" },
  { id: "issued", label: "Issued", hint: "Human approval" },
  { id: "result", label: "Result", hint: "Final score" },
  { id: "graded", label: "Graded", hint: "ATS vs stored line" },
] as const;

export function Pipeline({ active = "research" }: { active?: (typeof STEPS)[number]["id"] }) {
  const idx = STEPS.findIndex((s) => s.id === active);
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {STEPS.map((s, i) => {
        const on = i === idx;
        const past = i < idx;
        return (
          <li
            key={s.id}
            className={cn(
              "rounded-lg border px-3 py-3",
              on ? "border-watch/50 bg-watch/10" : "border-border bg-surface",
            )}
          >
            <p className="font-mono text-[10px] tracking-wide text-subtle uppercase">
              {String(i + 1).padStart(2, "0")}
            </p>
            <p className={cn("mt-1 text-sm font-medium", on ? "text-fg" : "text-muted")}>{s.label}</p>
            <p className="mt-1 text-xs text-subtle">{s.hint}</p>
            {on ? <p className="mt-2 font-mono text-[10px] text-watch uppercase">You are here</p> : null}
            {past ? <p className="mt-2 font-mono text-[10px] text-hit uppercase">Stored</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
