import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/digest")({ component: DigestPage });

function DigestPage() {
  return (
    <article className="max-w-2xl">
      <h2 className="font-display text-2xl">Daily digest</h2>
      <p className="mt-1 font-mono text-xs text-muted">Friday, August 28, 2026 · wmcdaniel@gmail.com</p>

      <section className="mt-8">
        <h3 className="font-display text-xl">Clock</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          NCAAF is Week 0 / Week 1 openers (FBS Saturday Aug 29). NFL is preseason Week 3; regular season
          Week 1 opens Sept 9. There are no Week 3 college or Week 2 NFL regular-season results to grade.
        </p>
      </section>

      <section className="mt-6">
        <h3 className="font-display text-xl">Ledger</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          ATS 0-0-0. Moneyline 0-0-0. Totals 0-0-0. Sample n=0. The 75% ATS target is not a rate yet.
        </p>
      </section>

      <section className="mt-6">
        <h3 className="font-display text-xl">What we searched</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>GitHub Fluff421: BIM skill exists; no pick log.</li>
          <li>Automations titled as if 2025 W3/W2 were final were not imported.</li>
          <li>ESPN FPI and ScoresAndOdds retrieved today. Regular-board games are upcoming.</li>
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="font-display text-xl">Issued plays</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          None. Watch list only. Closest NCAAF number: Colorado +6.5 at Georgia Tech. Closest NFL Week 1
          numbers: Bills −1.5, Bears −2.5, Packers −1.5 versus FPI. No units.
        </p>
      </section>

      <section className="mt-6">
        <h3 className="font-display text-xl">System change</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Engine is FPI + home-field only. BIM 6-model ensemble remains spec until graded regular-season games exist.
        </p>
      </section>

      <section className="mt-6">
        <h3 className="font-display text-xl">GitHub</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Creating Fluff421/betting-intelligence-ledger failed: the GitHub connector is read-only (403).
          Reconnect GitHub with repository contents write and the daily job will commit LEDGER.md and MODEL.md.
          Copies live in this app under data/.
        </p>
      </section>
    </article>
  );
}
