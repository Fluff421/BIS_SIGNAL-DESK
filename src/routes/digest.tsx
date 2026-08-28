import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/digest")({ component: DigestPage });

function DigestPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl">Digest</h2>
        <p className="mt-2 text-sm text-muted">Weekly intelligence brief.</p>
      </div>
      <article className="prose prose-invert max-w-none rounded-xl border border-border bg-surface p-6">
        <p>See <code>public/data/digest.md</code> for the current brief content.</p>
      </article>
    </div>
  );
}
