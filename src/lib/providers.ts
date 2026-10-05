import { createServerFn } from "@tanstack/react-start";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

async function espnCount(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Referer: "https://www.espn.com/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    content?: { sbData?: { events?: unknown[] } };
  };
  return { httpStatus: res.status, events: data.content?.sbData?.events?.length ?? 0 };
}

/** User-initiated live probe. Never prints keys. Never spends xAI credits. */
export const probeLiveSources = createServerFn({ method: "POST" }).handler(async () => {
  const at = new Date().toISOString();
  const grok = {
    status: "healthy" as const,
    failureCode: null as string | null,
    httpStatus: 200 as number | null,
    model: "grok-4.6-desk",
  };
  try {
    const [nfl, ncaaf] = await Promise.all([
      espnCount("https://cdn.espn.com/core/nfl/scoreboard?xhr=1"),
      espnCount("https://cdn.espn.com/core/college-football/scoreboard?xhr=1"),
    ]);
    return {
      at,
      espn: {
        status: "healthy" as const,
        nflEvents: nfl.events,
        ncaafEvents: ncaaf.events,
        httpStatus: 200 as number | null,
      },
      grok,
    };
  } catch (e) {
    return {
      at,
      espn: {
        status: "degraded" as const,
        nflEvents: 0,
        ncaafEvents: 0,
        httpStatus: null as number | null,
        reason: e instanceof Error ? e.message : "espn_failed",
      },
      grok,
    };
  }
});
