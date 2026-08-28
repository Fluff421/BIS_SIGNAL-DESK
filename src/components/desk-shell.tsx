import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/board", label: "Board" },
  { to: "/ledger", label: "Ledger" },
  { to: "/model", label: "Model" },
  { to: "/digest", label: "Digest" },
] as const;

export function DeskShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="font-mono text-xs tracking-[0.22em] text-muted uppercase">
              2026 NFL / NCAAF
            </p>
            <h1 className="font-display text-3xl font-medium tracking-tight text-fg sm:text-4xl">
              Signal Desk
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              FPI versus the market. No invented scores. Ledger starts at zero.
            </p>
          </div>
          <p className="font-mono text-xs text-subtle">
            As of Aug 28, 2026 · wmcdaniel@gmail.com
          </p>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
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
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
