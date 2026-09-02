#!/usr/bin/env node
/**
 * Scaffold for multi-year historical backfill (results + lines).
 * Does not require paid odds to start: CFBD (NCAAF) + documented nflverse path.
 *
 * Usage:
 *   CFBD_API_KEY=... node scripts/backfill-historical.mjs --years 2023,2024,2025
 *   node scripts/backfill-historical.mjs --help
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "data", "historical");

function parseYears() {
  const i = process.argv.indexOf("--years");
  if (i < 0) return [2023, 2024, 2025];
  return String(process.argv[i + 1] || "")
    .split(",")
    .map((y) => Number(y.trim()))
    .filter((y) => y >= 2015 && y <= 2030);
}

async function cfbdGames(year, key) {
  const url = `https://api.collegefootballdata.com/games?year=${year}&seasonType=regular`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`CFBD games ${year}: HTTP ${res.status}`);
  return res.json();
}

async function cfbdLines(year, key) {
  const url = `https://api.collegefootballdata.com/lines?year=${year}&seasonType=regular`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`CFBD lines ${year}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`backfill-historical.mjs
  CFBD_API_KEY=... node scripts/backfill-historical.mjs --years 2023,2024,2025
Writes JSON under data/historical/ for offline training / ATS backtests.`);
    return;
  }
  const key = process.env.CFBD_API_KEY;
  if (!key) {
    console.error("Set CFBD_API_KEY for NCAAF historical games + lines.");
    console.error("NFL: use nflreadpy/nflverse offline — see docs/DATA_SOURCES.md");
    process.exit(1);
  }
  const years = parseYears();
  mkdirSync(OUT, { recursive: true });
  for (const year of years) {
    console.error(`CFBD ${year} games...`);
    const games = await cfbdGames(year, key);
    writeFileSync(join(OUT, `ncaaf-games-${year}.json`), JSON.stringify(games));
    console.error(`  ${games.length} games`);
    console.error(`CFBD ${year} lines...`);
    try {
      const lines = await cfbdLines(year, key);
      writeFileSync(join(OUT, `ncaaf-lines-${year}.json`), JSON.stringify(lines));
      console.error(`  ${Array.isArray(lines) ? lines.length : 0} line rows`);
    } catch (e) {
      console.error(`  lines failed:`, e.message || e);
    }
  }
  console.log(`Wrote under ${OUT}`);
  console.log("Next: join lines to finals, grade ATS, tune watch/play thresholds.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
