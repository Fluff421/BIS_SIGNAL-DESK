#!/usr/bin/env node
/**
 * Pull live/upcoming odds from The Odds API and map into desk board.json shape.
 * Model edges still need FPI priors from snapshot/model — this script fills market lines.
 *
 * Usage:
 *   ODDS_API_KEY=... node scripts/update-board-from-odds.mjs
 *   ODDS_API_KEY=... node scripts/update-board-from-odds.mjs --sport ncaaf
 *   ODDS_API_KEY=... node scripts/update-board-from-odds.mjs --dry-run
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const KEY = process.env.ODDS_API_KEY || "";
const DRY = process.argv.includes("--dry-run");
const sportArg = (() => {
  const i = process.argv.indexOf("--sport");
  return i >= 0 ? process.argv[i + 1] : "both";
})();

const SPORT_KEYS = {
  ncaaf: "americanfootball_ncaaf",
  nfl: "americanfootball_nfl",
};

function loadJson(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function fpiMap(snapshot) {
  const map = new Map();
  for (const row of snapshot?.ncaafFpi ?? []) {
    map.set(norm(row.team), Number(row.fpi));
  }
  for (const row of snapshot?.nflFpi ?? []) {
    map.set(norm(row.team), Number(row.fpi));
  }
  return map;
}

function norm(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pickSpread(bookmakers, home, away) {
  // Prefer consensus-ish: first US book with spreads
  for (const bm of bookmakers || []) {
    const m = (bm.markets || []).find((x) => x.key === "spreads");
    if (!m) continue;
    const homeOut = m.outcomes?.find((o) => o.name === home);
    const awayOut = m.outcomes?.find((o) => o.name === away);
    if (homeOut && typeof homeOut.point === "number") {
      return {
        marketHome: homeOut.point,
        book: bm.title || bm.key,
        total: (() => {
          const t = (bm.markets || []).find((x) => x.key === "totals");
          const over = t?.outcomes?.find((o) => o.name === "Over");
          return typeof over?.point === "number" ? over.point : null;
        })(),
      };
    }
    if (awayOut && typeof awayOut.point === "number") {
      return {
        marketHome: -awayOut.point,
        book: bm.title || bm.key,
        total: null,
      };
    }
  }
  return null;
}

async function fetchOdds(sportKey) {
  if (!KEY) throw new Error("Set ODDS_API_KEY");
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", KEY);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "spreads,totals");
  url.searchParams.set("oddsFormat", "american");
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${sportKey} HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  console.error(
    `[odds] ${sportKey} remaining=${res.headers.get("x-requests-remaining")} used=${res.headers.get("x-requests-used")}`,
  );
  return res.json();
}

function modelHomeMargin(homeFpi, awayFpi, hfa) {
  if (homeFpi == null || awayFpi == null) return null;
  return homeFpi - awayFpi + hfa;
}

function buildWatch(events, league, fpi, hfa, watchThreshold) {
  const rows = [];
  for (const ev of events) {
    const home = ev.home_team;
    const away = ev.away_team;
    const spread = pickSpread(ev.bookmakers, home, away);
    if (!spread) continue;
    const hf = fpi.get(norm(home));
    const af = fpi.get(norm(away));
    const modelHome = modelHomeMargin(hf, af, hfa);
    const marketHome = spread.marketHome;
    let edgeTo = "";
    let edge = 0;
    if (modelHome != null) {
      // Positive edge to home if model is more bullish on home than market
      const raw = modelHome - marketHome;
      edge = Math.abs(raw);
      edgeTo = raw > 0 ? home : away;
    }
    if (modelHome != null && edge < watchThreshold) continue;
    rows.push({
      league,
      kick: (ev.commence_time || "").slice(0, 10),
      away,
      home,
      neutral: false,
      marketHome,
      modelHome: modelHome == null ? null : Number(modelHome.toFixed(1)),
      edgeTo: modelHome == null ? "" : edgeTo,
      edge: modelHome == null ? 0 : Number(edge.toFixed(1)),
      total: spread.total ?? 0,
      note:
        modelHome == null
          ? `Market only (${spread.book}). No FPI match for edge.`
          : `Live odds via The Odds API (${spread.book}). FPI+HFA edge.`,
    });
  }
  rows.sort((a, b) => b.edge - a.edge);
  return rows;
}

async function main() {
  const snapshot = loadJson("src/data/snapshot.json") || loadJson("public/data/snapshot.json") || {};
  const model = loadJson("src/data/model.json") || loadJson("public/data/model.json") || {};
  const fpi = fpiMap(snapshot);
  const watchThreshold = Number(model.watchThreshold ?? 3);
  const hfaNcaaf = Number(model.hfa?.ncaaf ?? 2.5);
  const hfaNfl = Number(model.hfa?.nfl ?? 2.0);

  const sports = [];
  if (sportArg === "both" || sportArg === "ncaaf") sports.push(["NCAAF", SPORT_KEYS.ncaaf, hfaNcaaf]);
  if (sportArg === "both" || sportArg === "nfl") sports.push(["NFL", SPORT_KEYS.nfl, hfaNfl]);

  let watch = [];
  for (const [league, key, hfa] of sports) {
    const events = await fetchOdds(key);
    watch = watch.concat(buildWatch(events, league, fpi, hfa, watchThreshold));
  }

  const board = {
    issuedPlays: [],
    watch,
    aligned: [],
    updated: new Date().toISOString(),
    source: "the-odds-api",
  };

  const out = JSON.stringify(board, null, 2) + "\n";
  console.log(`watch rows: ${watch.length}`);
  if (DRY) {
    console.log(out.slice(0, 1500));
    return;
  }
  writeFileSync(join(ROOT, "src/data/board.json"), out);
  writeFileSync(join(ROOT, "public/data/board.json"), out);
  console.log("wrote src/data/board.json and public/data/board.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
