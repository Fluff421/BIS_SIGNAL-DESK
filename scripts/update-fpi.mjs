#!/usr/bin/env node
/**
 * Refresh ESPN FPI (or CFBD fallback) into src/data/snapshot.json.
 * Usage: CFBD_API_KEY=... node scripts/update-fpi.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { renameSync } from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SNAP = join(ROOT, "src/data/snapshot.json");
const PUB = join(ROOT, "public/data/snapshot.json");
const CFBD_KEY = process.env.CFBD_API_KEY || "";

function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const staged = join(dirname(path), `.${randomBytes(6).toString("hex")}.tmp`);
  writeFileSync(staged, text);
  renameSync(staged, path);
}

function loadSnap() {
  if (!existsSync(SNAP)) return { ncaafFpi: [], nflFpi: [] };
  return JSON.parse(readFileSync(SNAP, "utf8"));
}

function normTeam(name) {
  return String(name || "")
    .replace(/\s+(University|Univ\.?)$/i, "")
    .trim();
}

async function fetchEspnFpi(league) {
  const url =
    league === "nfl"
      ? "https://site.web.api.espn.com/apis/fpi/v1/teams?sport=football&league=nfl&limit=50"
      : "https://site.web.api.espn.com/apis/fpi/v1/teams?sport=football&league=college-football&limit=200";
  const res = await fetch(url, {
    headers: {
      "User-Agent": "BIS-Signal-Desk/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`ESPN FPI ${league} HTTP ${res.status}`);
  const data = await res.json();
  const teams = data?.teams || data?.items || data || [];
  const rows = [];
  const list = Array.isArray(teams) ? teams : [];
  for (const t of list) {
    const name =
      t.team?.displayName ||
      t.team?.name ||
      t.displayName ||
      t.name ||
      t.teamName;
    const fpi =
      t.fpi ??
      t.currentRating ??
      t.rating ??
      t.stats?.find?.((s) => /fpi/i.test(s.name || s.abbreviation || ""))?.value;
    if (name == null || fpi == null || Number.isNaN(Number(fpi))) continue;
    rows.push({ team: normTeam(name), fpi: Number(Number(fpi).toFixed(1)), rank: rows.length + 1 });
  }
  if (!rows.length) throw new Error(`ESPN FPI ${league}: empty parse`);
  rows.sort((a, b) => b.fpi - a.fpi);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

async function fetchCfbdFpi(year = 2026) {
  if (!CFBD_KEY) throw new Error("CFBD_API_KEY required for CFBD FPI fallback");
  const url = `https://api.collegefootballdata.com/ratings/fpi?year=${year}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${CFBD_KEY}` } });
  if (!res.ok) throw new Error(`CFBD FPI HTTP ${res.status}`);
  const data = await res.json();
  const rows = (data || [])
    .map((r, i) => ({
      team: normTeam(r.team || r.teamName),
      fpi: Number(Number(r.fpi ?? r.rating ?? r.conferenceRating ?? 0).toFixed(1)),
      rank: i + 1,
    }))
    .filter((r) => r.team);
  rows.sort((a, b) => b.fpi - a.fpi);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

async function main() {
  const snap = loadSnap();
  let ncaaf = snap.ncaafFpi || [];
  let nfl = snap.nflFpi || [];
  let source = "preserved";

  try {
    ncaaf = await fetchEspnFpi("ncaaf");
    source = "espn";
    console.error(`[fpi] ESPN NCAAF: ${ncaaf.length} teams`);
  } catch (e) {
    console.error(`[fpi] ESPN NCAAF failed: ${e.message}`);
    try {
      ncaaf = await fetchCfbdFpi(2026);
      source = "cfbd";
      console.error(`[fpi] CFBD NCAAF: ${ncaaf.length} teams`);
    } catch (e2) {
      console.error(`[fpi] CFBD NCAAF failed: ${e2.message} — keeping prior`);
    }
  }

  try {
    nfl = await fetchEspnFpi("nfl");
    console.error(`[fpi] ESPN NFL: ${nfl.length} teams`);
  } catch (e) {
    console.error(`[fpi] ESPN NFL failed: ${e.message} — keeping prior NFL FPI`);
  }

  const next = {
    ...snap,
    asOf: new Date().toISOString(),
    ncaafFpi: ncaaf,
    nflFpi: nfl,
    fpiSource: source,
  };

  const histDir = join(ROOT, "src/data/fpi-history");
  mkdirSync(histDir, { recursive: true });
  const day = next.asOf.slice(0, 10);
  atomicWrite(join(histDir, `fpi-${day}.json`), JSON.stringify({ asOf: next.asOf, ncaaf, nfl }, null, 2) + "\n");

  const out = JSON.stringify(next, null, 2) + "\n";
  atomicWrite(SNAP, out);
  if (existsSync(dirname(PUB))) atomicWrite(PUB, out);
  console.log(`wrote snapshot FPI source=${source} ncaaf=${ncaaf.length} nfl=${nfl.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
