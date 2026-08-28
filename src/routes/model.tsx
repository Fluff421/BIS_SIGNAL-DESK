import { createFileRoute } from "@tanstack/react-router";
import { deskModel } from "@/lib/desk";

export const Route = createFileRoute("/model")({ component: ModelPage });

function ModelPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl">Model</h2>
        <p className="mt-2 text-sm text-muted">{deskModel.engine}</p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm leading-relaxed text-fg">{deskModel.notes ?? "FPI + home-field advantage."}</p>
      </div>
    </div>
  );
}
