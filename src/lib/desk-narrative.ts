/** Credit-free Grok desk composer. Builds an honest brief from stored tape. */

export type NarrativeInput = {
  week: number | string;
  season: number;
  watch: number;
  highNoise: number;
  staleFpi: number;
  issued: number;
  gradedN: number;
  atsHits: number;
  atsMisses: number;
  atsPushes: number;
  helpers: string[];
  hurters: string[];
  topGames: Array<{
    matchup: string;
    league: string;
    edge: number;
    edgeTo: string;
    nBooks?: number;
    confidence?: string;
  }>;
  espnNcaafFinals: number;
  espnNflEvents: number;
  backtestAts: number | null;
  backtestN: number | null;
  engine: string;
};

export function composeDeskBrief(d: NarrativeInput): string {
  const n = d.gradedN;
  const sample =
    n === 0
      ? "Issued ATS is 0-0-0 (n=0). The 75% target is not measurable. Do not quote a hit rate."
      : n < 30
        ? `Issued ATS is ${d.atsHits}-${d.atsMisses}-${d.atsPushes} (n=${n}). Below n=30 — treat any rate as noise.`
        : `Issued ATS is ${d.atsHits}-${d.atsMisses}-${d.atsPushes} (n=${n}). Still report intervals, not slogans.`;

  const games = d.topGames.slice(0, 3).map((g) => {
    const books = g.nBooks != null ? `, ${g.nBooks} books` : "";
    return `${g.matchup} (${g.league}, difference ${Number(g.edge).toFixed(1)} toward ${g.edgeTo}${books})`;
  });

  const hist =
    d.backtestAts != null && d.backtestN
      ? ` Historical FPI+HFA ATS versus close is ${(d.backtestAts * 100).toFixed(1)}% on ${d.backtestN} NCAAF regular-season sides — near a coin flip, which is why raw disagreement is not a ticket.`
      : "";

  const espn =
    d.espnNcaafFinals || d.espnNflEvents
      ? ` ESPN CDN tape: ${d.espnNflEvents} NFL events on the current board, ${d.espnNcaafFinals} NCAAF games already final. Finals are results tape, not issued grades.`
      : " ESPN scoreboard is used when the CDN answers; a failed pull keeps the last good tape.";

  const suppressed = d.staleFpi + d.highNoise;
  const hurters = d.hurters
    .filter((h) => !/grok narrative unavailable/i.test(h))
    .slice(0, 3)
    .join(" ");

  return [
    `BIS Signal Desk, ${d.season} week ${d.week}. Engine: ${d.engine}`,
    sample,
    `${d.watch} rows sit in the research (WATCH) band. ${d.staleFpi} STALE_FPI and ${d.highNoise} HIGH_NOISE rows stay suppressed (${suppressed} diagnostics). Issued plays: ${d.issued}.`,
    `Helpers: multi-book consensus and observation timestamps are stored; ${d.helpers[0] ?? "watch band is explicit."}`,
    `Hurters: ${hurters || "ensemble unfitted; missing injury/QB context blocks issuance."}`,
    games.length
      ? `Top research observations, not plays: ${games.join("; ")}. Each fails the issuance gates (human review, n≥30, unresolved context). An LLM cannot promote them.`
      : "No research rows in the 3–7 band.",
    espn + hist,
    "Confidence: INSUFFICIENT until issued sides are graded. Change the model only when out-of-sample evidence says to.",
  ].join(" ");
}
