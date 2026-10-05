import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { deskBoard, deskHealth, deskResearch } from "@/lib/desk";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/board", label: "Board" },
  { to: "/ledger", label: "Ledger" },
  { to: "/model", label: "Model" },
  { to: "/digest", label: "Digest" },
  { to: "/quality", label: "Quality" },
] as const;

export function DeskShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const grok = deskHealth.grok.status;
  const c = deskBoard.counts;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-elevated focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="font-mono text-xs tracking-[0.22em] text-muted uppercase">
              BIS · 2026 NCAAF / NFL
            </p>
            <h1 className="font-display text-3xl font-medium tracking-tight text-fg sm:text-4xl">
              Signal Desk
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              Observation, model, research, issued, graded — five different things.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <p className="font-mono text-xs text-subtle">
              Tape {deskBoard.updated.slice(0, 16).replace("T", " ")}Z · library {c.library} ·
              clubs {c.teamsCovered}
            </p>
            <p className="font-mono text-xs text-watch">
              Narrative {grok === "healthy" ? "live" : "fallback"} · slate {c.observe} · research n=
              {deskResearch.ats.n} · issued {c.issued}
            </p>
          </div>
        </div>
        <nav
          aria-label="Desk sections"
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6"
        >
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "min-h-11 shrink-0 rounded-sm px-3 py-2 text-sm transition-colors duration-150",
                  active ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
