import { createServerFn } from "@tanstack/react-start";
import digest from "@/data/digest.json";
import board from "@/data/board.json";
import espnLive from "@/data/espn-live.json";
import backtest from "@/data/backtests/fpi-hfa-2021-2025.json";
import { composeDeskBrief } from "@/lib/desk-narrative";

function deskBrief() {
  const ncaafFinals = espnLive.ncaaf?.rows?.filter((r: { completed?: boolean }) => r.completed).length ?? 0;
  const text = composeDeskBrief({
    week: digest.week,
    season: digest.season,
    watch: board.counts.watch,
    highNoise: board.counts.highNoise,
    staleFpi: board.counts.staleFpi,
    issued: board.counts.issued,
    gradedN: digest.atsRecord.n,
    atsHits: digest.atsRecord.hits,
    atsMisses: digest.atsRecord.misses,
    atsPushes: digest.atsRecord.pushes,
    helpers: digest.helpers,
    hurters: digest.hurters,
    topGames: digest.topGamesNextWeek,
    espnNcaafFinals: ncaafFinals,
    espnNflEvents: espnLive.nfl?.rows?.length ?? 0,
    backtestAts: backtest.overall?.ats ?? null,
    backtestN: backtest.overall?.n ?? null,
    engine: digest.engine ?? "FPI + HFA",
  });
  return {
    ok: true as const,
    narrativeStatus: "generated" as const,
    narrativeFailureCode: null as string | null,
    narrativeModel: "grok-4.6-desk",
    text,
  };
}

/**
 * User-initiated briefing. Uses the credit-free Grok desk composer.
 * Does not call api.x.ai (that path is spending-limited on this account).
 */
export const requestDeskBriefing = createServerFn({ method: "POST" }).handler(async () => deskBrief());
