#!/usr/bin/env node
/**
 * API discovery catalog for BIS Signal Desk.
 * Lists known live/historical sources and optionally probes reachability.
 *
 * Usage:
 *   node scripts/discover-odds-apis.mjs
 *   ODDS_API_KEY=... CFBD_API_KEY=... node scripts/discover-odds-apis.mjs --probe
 */

const CATALOG = [
  {
    id: "the-odds-api",
    role: "live_odds",
    sports: ["americanfootball_ncaaf", "americanfootball_nfl"],
    base: "https://api.the-odds-api.com/v4",
    freeTier: "~500 credits/mo",
    historical: "Paid plans; featured markets from ~2020",
    envKey: "ODDS_API_KEY",
    docs: "https://the-odds-api.com/",
    probe: async (key) => {
      const url = `${"https://api.the-odds-api.com/v4"}/sports/?apiKey=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      const remaining = res.headers.get("x-requests-remaining");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sports = await res.json();
      const keys = sports.filter((s) => /americanfootball_(nfl|ncaaf)/.test(s.key));
      return { ok: true, remaining, footballSports: keys.map((s) => s.key) };
    },
  },
  {
    id: "collegefootballdata",
    role: "ncaaf_results_lines_metrics",
    sports: ["ncaaf"],
    base: "https://api.collegefootballdata.com",
    freeTier: "1k calls/mo",
    historical: "Multi-year games + betting lines on free tier",
    envKey: "CFBD_API_KEY",
    docs: "https://collegefootballdata.com/",
    probe: async (key) => {
      const url = "https://api.collegefootballdata.com/games?year=2025&seasonType=regular&week=1";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const games = await res.json();
      return { ok: true, sampleGames: Array.isArray(games) ? games.length : 0 };
    },
  },
  {
    id: "nflverse",
    role: "nfl_results_pbp_schedules",
    sports: ["nfl"],
    base: "https://github.com/nflverse/nflverse-data",
    freeTier: "Free bulk releases",
    historical: "Schedules/PBP back many seasons; lines where present",
    envKey: null,
    docs: "https://github.com/nflverse",
    probe: async () => {
      const url =
        "https://github.com/nflverse/nflverse-data/releases/download/schedules/schedules.csv";
      const res = await fetch(url, { method: "HEAD" });
      return { ok: res.ok || res.status === 302 || res.status === 200, status: res.status };
    },
  },
  {
    id: "oddspapi",
    role: "live_and_historical_odds_alt",
    sports: ["nfl", "ncaaf", "many"],
    base: "https://oddspapi.io",
    freeTier: "Claims free historical on free tier — verify current ToS",
    historical: "Per-fixture price history endpoints",
    envKey: "ODDSPAPI_KEY",
    docs: "https://oddspapi.io",
    probe: null,
  },
  {
    id: "parlayapi",
    role: "live_odds_alt",
    sports: ["nfl", "ncaaf"],
    base: "https://parlay-api.com",
    freeTier: "Higher free credits than some peers (verify)",
    historical: "Closing-line archives claimed; verify coverage",
    envKey: "PARLAY_API_KEY",
    docs: "https://parlay-api.com",
    probe: null,
  },
];

function printCatalog() {
  console.log("BIS Signal Desk — odds / results API catalog\n");
  for (const s of CATALOG) {
    console.log(`• ${s.id}  [${s.role}]`);
    console.log(`  sports: ${s.sports.join(", ")}`);
    console.log(`  free: ${s.freeTier}`);
    console.log(`  historical: ${s.historical}`);
    console.log(`  env: ${s.envKey ?? "(none)"}`);
    console.log(`  docs: ${s.docs}\n`);
  }
  console.log("Primary recommendation for this repo:");
  console.log("  Live:     The Odds API (ODDS_API_KEY)");
  console.log("  NCAAF hx: CFBD (CFBD_API_KEY)");
  console.log("  NFL hx:   nflverse (no key)");
}

async function probeAll() {
  for (const s of CATALOG) {
    if (!s.probe) {
      console.log(`${s.id}: skip probe (no automated probe)`);
      continue;
    }
    const key = s.envKey ? process.env[s.envKey] : null;
    if (s.envKey && !key) {
      console.log(`${s.id}: skip probe (set ${s.envKey})`);
      continue;
    }
    try {
      const result = await s.probe(key);
      console.log(`${s.id}: OK`, result);
    } catch (err) {
      console.log(`${s.id}: FAIL`, err instanceof Error ? err.message : err);
    }
  }
}

const probe = process.argv.includes("--probe");
printCatalog();
if (probe) {
  console.log("\n— probes —\n");
  probeAll().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
