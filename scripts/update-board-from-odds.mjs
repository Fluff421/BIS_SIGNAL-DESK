#!/usr/bin/env node
/**
 * Live odds → board.json with FPI+HFA edges, confidence flags, consensus books,
 * line movement vs previous board.
 * ODDS_API_KEY=... node scripts/update-board-from-odds.mjs [--sport ncaaf|nfl|both] [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = process.env.ODDS_API_KEY || "";
const DRY = process.argv.includes("--dry-run");
const sportArg = (() => {
  const i = process.argv.indexOf("--sport");
  return i >= 0 ? process.argv[i + 1] : "both";
})();

const SPORT_KEYS = { ncaaf: "americanfootball_ncaaf", nfl: "americanfootball_nfl" };

function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const staged = join(dirname(path), `.${randomBytes(6).toString("hex")}.tmp`);
  writeFileSync(staged, text);
  renameSync(staged, path);
}
function loadJson(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}
function norm(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function fpiMap(rows) {
  const map = new Map();
  for (const row of rows ?? []) map.set(norm(row.team), Number(row.fpi));
  return map;
}
function fpiLookup(map, teamName) {
  const n = norm(teamName);
  if (!n) return undefined;
  if (map.has(n)) return map.get(n);
  let bestKey = "", bestVal;
  for (const [k, v] of map.entries()) {
    if (!k || k.length < 3) continue;
    const hit = n === k || n.includes(` ${k} `) || n.startsWith(`${k} `) || n.endsWith(` ${k}`) || n.includes(k);
    if (hit && k.length >= bestKey.length) { bestKey = k; bestVal = v; }
  }
  if (bestKey) return bestVal;
  const last = n.split(/\s+/).pop();
  if (map.has(last)) return map.get(last);
  if (n.includes("49ers") && map.has("49ers")) return map.get("49ers");
  return undefined;
}
function consensusSpread(bookmakers, home, away) {
  const points = []; let totalSum = 0, totalN = 0; const books = [];
  for (const bm of bookmakers || []) {
    const m = (bm.markets || []).find((x) => x.key === "spreads");
    if (!m) continue;
    const homeOut = m.outcomes?.find((o) => o.name === home);
    const awayOut = m.outcomes?.find((o) => o.name === away);
    let pt = null;
    if (homeOut && typeof homeOut.point === "number") pt = homeOut.point;
    else if (awayOut && typeof awayOut.point === "number") pt = -awayOut.point;
    if (pt == null) continue;
    points.push(pt); books.push(bm.title || bm.key);
    const t = (bm.markets || []).find((x) => x.key === "totals");
    const over = t?.outcomes?.find((o) => o.name === "Over");
    if (typeof over?.point === "number") { totalSum += over.point; totalN++; }
  }
  if (!points.length) return null;
  const mean = points.reduce((a, b) => a + b, 0) / points.length;
  const variance = points.reduce((a, b) => a + (b - mean) ** 2, 0) / points.length;
  return {
    marketHome: Number(mean.toFixed(2)),
    stddev: Number(Math.sqrt(variance).toFixed(2)),
    nBooks: points.length,
    book: books.slice(0, 3).join("|"),
    total: totalN ? Number((totalSum / totalN).toFixed(1)) : null,
  };
}
function modelHomeMargin(homeFpi, awayFpi, hfa) {
  if (homeFpi == null || awayFpi == null) return null;
  return homeFpi - awayFpi + hfa;
}
function confidenceFor(edge) {
  if (edge > 20) return "STALE_FPI";
  if (edge > 10) return "HIGH_NOISE";
  if (edge > 3) return "WATCH";
  return "ALIGNED";
}
function prevMarketMap(prevBoard) {
  const map = new Map();
  for (const w of prevBoard?.watch || []) map.set(`${w.league}|${norm(w.home)}|${norm(w.away)}`, w.marketHome);
  return map;
}
async function fetchOdds(sportKey) {
  if (!KEY) throw new Error("Set ODDS_API_KEY");
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", KEY);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "spreads,totals");
  url.searchParams.set("oddsFormat", "american");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${sportKey} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  console.error(`[odds] ${sportKey} remaining=${res.headers.get("x-requests-remaining")} used=${res.headers.get("x-requests-used")}`);
  return res.json();
}
function buildWatch(events, league, fpi, hfa, watchThreshold, prevMap) {
  const rows = []; const fpiMismatch = [];
  const now = Date.now(); const horizonMs = 21 * 24 * 60 * 60 * 1000;
  for (const ev of events) {
    const kickMs = Date.parse(ev.commence_time || "");
    if (Number.isFinite(kickMs) && (kickMs < now - 12 * 3600 * 1000 || kickMs > now + horizonMs)) continue;
    const home = ev.home_team, away = ev.away_team;
    const spread = consensusSpread(ev.bookmakers, home, away);
    if (!spread) continue;
    const hf = fpiLookup(fpi, home), af = fpiLookup(fpi, away);
    const modelHome = modelHomeMargin(hf, af, hfa);
    if (modelHome == null) { fpiMismatch.push({ league, home, away, marketHome: spread.marketHome }); continue; }
    const marketHome = spread.marketHome;
    if (Math.abs(marketHome) > 28) continue;
    const raw = modelHome - marketHome;
    const edge = Math.abs(raw);
    if (edge < watchThreshold) continue;
    const edgeTo = raw > 0 ? home : away;
    const confidence = confidenceFor(edge);
    const key = `${league}|${norm(home)}|${norm(away)}`;
    const prev = prevMap.get(key);
    const lineMovement = prev == null ? null : Number((marketHome - prev).toFixed(2));
    const movingAgainstModel = lineMovement == null ? null : (raw > 0 && lineMovement < 0) || (raw < 0 && lineMovement > 0);
    rows.push({
      league, kick: (ev.commence_time || "").slice(0, 10), away, home, neutral: false,
      marketHome, modelHome: Number(modelHome.toFixed(1)), edgeTo, edge: Number(edge.toFixed(1)),
      total: spread.total ?? 0, confidence, nBooks: spread.nBooks, spreadStddev: spread.stddev,
      lineMovement, movingAgainstModel,
      note: `Consensus ${spread.nBooks} books (${spread.book}). FPI+HFA. conf=${confidence}`,
    });
  }
  rows.sort((a, b) => b.edge - a.edge);
  return { rows, fpiMismatch };
}
async function main() {
  const snapshot = loadJson("src/data/snapshot.json") || loadJson("public/data/snapshot.json") || {};
  const model = loadJson("src/data/model.json") || {};
  const prevBoard = loadJson("src/data/board.json") || {};
  const prevMap = prevMarketMap(prevBoard);
  const fpiNcaaf = fpiMap(snapshot.ncaafFpi);
  const fpiNfl = fpiMap(snapshot.nflFpi);
  const watchThreshold = Number(model.watchThreshold ?? 3);
  const hfaNcaaf = Number(model.hfa?.ncaaf ?? 2.5);
  const hfaNfl = Number(model.hfa?.nfl ?? 2.0);
  const sports = [];
  if (sportArg === "both" || sportArg === "ncaaf") sports.push(["NCAAF", SPORT_KEYS.ncaaf, hfaNcaaf, fpiNcaaf]);
  if (sportArg === "both" || sportArg === "nfl") sports.push(["NFL", SPORT_KEYS.nfl, hfaNfl, fpiNfl]);
  let watch = [], mismatches = [];
  for (const [league, key, hfa, fpi] of sports) {
    const events = await fetchOdds(key);
    const { rows, fpiMismatch } = buildWatch(events, league, fpi, hfa, watchThreshold, prevMap);
    watch = watch.concat(rows); mismatches = mismatches.concat(fpiMismatch);
  }
  const primary = watch.filter((w) => w.confidence !== "STALE_FPI");
  const stale = watch.filter((w) => w.confidence === "STALE_FPI");
  const board = {
    issuedPlays: prevBoard.issuedPlays || [], watch: primary, staleFpi: stale,
    fpiMismatchSample: mismatches.slice(0, 25), aligned: [],
    updated: new Date().toISOString(), source: "the-odds-api+consensus",
  };
  const out = JSON.stringify(board, null, 2) + "\n";
  console.log(`watch=${primary.length} stale=${stale.length} mismatch=${mismatches.length}`);
  if (DRY) { console.log(out.slice(0, 1200)); return; }
  atomicWrite(join(ROOT, "src/data/board.json"), out);
  atomicWrite(join(ROOT, "public/data/board.json"), out);
  mkdirSync(join(ROOT, "src/data/board-history"), { recursive: true });
  if (prevBoard.updated) {
    const day = String(prevBoard.updated).slice(0, 10);
    atomicWrite(join(ROOT, "src/data/board-history", `board-${day}.json`), JSON.stringify(prevBoard, null, 2) + "\n");
  }
  console.log("wrote board.json (src + public)");
}
main().catch((err) => { console.error(err); process.exit(1); });
