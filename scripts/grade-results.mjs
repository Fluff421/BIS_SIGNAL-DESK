#!/usr/bin/env node
/** Grade completed board edges against CFBD finals (NCAAF). CFBD_API_KEY=... node scripts/grade-results.mjs */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CFBD_KEY = process.env.CFBD_API_KEY || "";
const YEAR = Number(process.env.SEASON_YEAR || 2026);
function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const staged = join(dirname(path), `.${randomBytes(6).toString("hex")}.tmp`);
  writeFileSync(staged, text);
  renameSync(staged, path);
}
function load(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}
function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function teamMatch(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}
async function cfbdGames(year) {
  if (!CFBD_KEY) throw new Error("Set CFBD_API_KEY");
  const url = `https://api.collegefootballdata.com/games?year=${year}&seasonType=regular`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${CFBD_KEY}` } });
  if (!res.ok) throw new Error(`CFBD games HTTP ${res.status}`);
  return res.json();
}
function gradeSide(marketHome, actualMargin, edgeTo, home, away) {
  const homeCoverMargin = actualMargin + marketHome;
  let homeResult = "PUSH";
  if (homeCoverMargin > 0.05) homeResult = "WIN";
  else if (homeCoverMargin < -0.05) homeResult = "LOSS";
  if (edgeTo === home) return { result: homeResult, coverBy: Number(homeCoverMargin.toFixed(1)) };
  if (edgeTo === away) {
    if (homeResult === "PUSH") return { result: "PUSH", coverBy: 0 };
    return { result: homeResult === "WIN" ? "LOSS" : "WIN", coverBy: Number((-homeCoverMargin).toFixed(1)) };
  }
  return { result: homeResult, coverBy: Number(homeCoverMargin.toFixed(1)) };
}
function edgeBucket(edge) {
  if (edge >= 15) return "15+";
  if (edge >= 7) return "7-15";
  if (edge >= 3) return "3-7";
  return "<3";
}
function recomputeAts(graded) {
  let hits = 0, misses = 0, pushes = 0;
  for (const g of graded) {
    if (g.result === "WIN") hits++;
    else if (g.result === "LOSS") misses++;
    else pushes++;
  }
  const n = hits + misses;
  const rate = n > 0 ? Number((hits / n).toFixed(3)) : null;
  return { hits, misses, pushes, n: hits + misses + pushes, rate };
}
async function main() {
  const board = load("src/data/board.json") || { watch: [] };
  const ledger = load("src/data/ledger.json") || {
    season: YEAR,
    regular: { ats: { hits: 0, misses: 0, pushes: 0, n: 0, rate: null } },
    target: { ats: 0.75, minN: 30, status: "Not measurable. n=0." },
    graded: [],
  };
  const today = new Date().toISOString().slice(0, 10);
  const pending = (board.watch || []).filter((w) => w.league === "NCAAF" && w.kick && w.kick < today);
  if (!pending.length) { console.log("No past NCAAF watch rows to grade."); return; }
  const games = await cfbdGames(YEAR);
  const completed = (games || []).filter((g) => g.completed && g.homePoints != null && g.awayPoints != null);
  const existingKeys = new Set((ledger.graded || []).map((g) => `${g.kick}|${norm(g.home)}|${norm(g.away)}`));
  let added = 0;
  for (const w of pending) {
    const key = `${w.kick}|${norm(w.home)}|${norm(w.away)}`;
    if (existingKeys.has(key)) continue;
    const match = completed.find((g) => {
      const gd = String(g.startDate || "").slice(0, 10);
      const dateOk = !w.kick || Math.abs(Date.parse(gd) - Date.parse(w.kick)) < 3 * 86400000;
      return dateOk && teamMatch(g.homeTeam, w.home) && teamMatch(g.awayTeam, w.away);
    });
    if (!match) continue;
    const actualMargin = Number(match.homePoints) - Number(match.awayPoints);
    const { result, coverBy } = gradeSide(w.marketHome, actualMargin, w.edgeTo, w.home, w.away);
    ledger.graded.push({
      game_id: String(match.id ?? ""), week: match.week ?? null, league: "NCAAF", kick: w.kick,
      away: w.away, home: w.home, marketHome: w.marketHome, modelHome: w.modelHome,
      edge: w.edge, edgeTo: w.edgeTo, edgeBucket: edgeBucket(Number(w.edge) || 0),
      confidence: w.confidence || null, actualMargin, result, coverBy, sampleWeight: 1.0, note: "auto-graded",
    });
    existingKeys.add(key); added++;
  }
  const ats = recomputeAts(ledger.graded);
  ledger.regular = ledger.regular || {};
  ledger.regular.ats = ats;
  ledger.updated = new Date().toISOString().slice(0, 10);
  ledger.target = ledger.target || { ats: 0.75, minN: 30 };
  if (ats.n < (ledger.target.minN || 30)) ledger.target.status = `Not measurable. n=${ats.n} (need ${ledger.target.minN}). rate=${ats.rate ?? "n/a"}`;
  else ledger.target.status = `n=${ats.n} rate=${ats.rate} target=${ledger.target.ats}`;
  const buckets = {};
  for (const g of ledger.graded) {
    const b = g.edgeBucket || edgeBucket(g.edge);
    if (!buckets[b]) buckets[b] = { hits: 0, misses: 0, pushes: 0 };
    if (g.result === "WIN") buckets[b].hits++;
    else if (g.result === "LOSS") buckets[b].misses++;
    else buckets[b].pushes++;
  }
  ledger.edgeBuckets = buckets;
  const out = JSON.stringify(ledger, null, 2) + "\n";
  atomicWrite(join(ROOT, "src/data/ledger.json"), out);
  if (existsSync(join(ROOT, "public/data"))) atomicWrite(join(ROOT, "public/data/ledger.json"), out);
  console.log(`graded +${added}; total graded=${ledger.graded.length}; ATS ${ats.hits}-${ats.misses}-${ats.pushes} rate=${ats.rate}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
