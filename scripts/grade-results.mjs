#!/usr/bin/env node
/**
 * Split grading.
 * Issued plays → ledger.regular.ats (the issued book).
 * Past watch / highNoise / staleFpi → research-ledger only.
 * Uses scores already stored on the row. Does not call CFBD, ESPN, or Odds API.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeJsonAtomic } from "./write-atomic.mjs";

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function load(root, rel, fallback) {
  const p = join(root, rel);
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, "utf8"));
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function rowKey(row) {
  return `${row.kick}|${norm(row.home)}|${norm(row.away)}`;
}

export function gradeSide(marketHome, actualMargin, edgeTo, home, away) {
  const homeCoverMargin = actualMargin + Number(marketHome);
  let homeResult = "PUSH";
  if (homeCoverMargin > 0.05) homeResult = "WIN";
  else if (homeCoverMargin < -0.05) homeResult = "LOSS";
  if (edgeTo === home) return { result: homeResult, coverBy: Number(homeCoverMargin.toFixed(1)) };
  if (edgeTo === away) {
    if (homeResult === "PUSH") return { result: "PUSH", coverBy: 0 };
    return {
      result: homeResult === "WIN" ? "LOSS" : "WIN",
      coverBy: Number((-homeCoverMargin).toFixed(1)),
    };
  }
  return { result: homeResult, coverBy: Number(homeCoverMargin.toFixed(1)) };
}

function toResearchResult(result) {
  if (result === "WIN") return "hit";
  if (result === "LOSS") return "miss";
  return "push";
}

export function recomputeAts(graded, win = "WIN", loss = "LOSS", push = "PUSH") {
  let hits = 0;
  let misses = 0;
  let pushes = 0;
  for (const g of graded) {
    if (g.result === win || g.result === "hit") hits += 1;
    else if (g.result === loss || g.result === "miss") misses += 1;
    else if (g.result === push || g.result === "push") pushes += 1;
  }
  const decided = hits + misses;
  return {
    hits,
    misses,
    pushes,
    n: hits + misses + pushes,
    rate: decided > 0 ? Number((hits / decided).toFixed(3)) : null,
  };
}

function scorable(row) {
  if (!row) return false;
  const completed = row.completed === true || row.status === "complete";
  return (
    completed &&
    row.marketHome != null &&
    Number.isFinite(Number(row.homePoints)) &&
    Number.isFinite(Number(row.awayPoints))
  );
}

function gradeRow(row, book) {
  const actualMargin = Number(row.homePoints) - Number(row.awayPoints);
  const side = row.approvedSide
    ? row.approvedSide === "home"
      ? row.home
      : row.away
    : row.edgeTo || row.home;
  const { result, coverBy } = gradeSide(row.marketHome, actualMargin, side, row.home, row.away);
  return {
    game_id: String(row.eventId || row.anId || ""),
    week: row.week ?? null,
    league: row.league,
    kick: row.kick,
    away: row.away,
    home: row.home,
    marketHome: row.marketHome,
    modelHome: row.modelHome,
    edge: row.edge,
    edgeTo: side,
    approvedSide: row.approvedSide ?? null,
    actualMargin,
    result: book === "research" ? toResearchResult(result) : result,
    coverBy,
    sampleWeight: 1.0,
    class: book === "issued" ? "ISSUED" : "RESEARCH",
    note: book === "issued" ? "issued-then-graded" : "research-only. not issued.",
  };
}

function isIssuedGrade(g) {
  return g?.class === "ISSUED" || Boolean(g?.approvedSide);
}

export function applyGrades({ board, ledger, research }) {
  const issuedPlays = Array.isArray(board?.issuedPlays) ? board.issuedPlays : [];
  const researchPool = [
    ...(board?.watch || []),
    ...(board?.highNoise || []),
    ...(board?.staleFpi || []),
  ];

  const kept = (ledger.graded || []).filter(isIssuedGrade);
  const issuedExisting = new Set(kept.map(rowKey));
  const nextGraded = [...kept];
  for (const row of issuedPlays) {
    if (!scorable(row)) continue;
    const key = rowKey(row);
    if (issuedExisting.has(key)) continue;
    nextGraded.push(gradeRow(row, "issued"));
    issuedExisting.add(key);
  }

  const researchExisting = new Set((research.rows || []).map(rowKey));
  const nextResearch = [...(research.rows || [])];
  for (const row of researchPool) {
    if (!scorable(row)) continue;
    const key = rowKey(row);
    if (researchExisting.has(key)) continue;
    nextResearch.push(gradeRow(row, "research"));
    researchExisting.add(key);
  }

  const ats = recomputeAts(nextGraded);
  const nextLedger = {
    ...ledger,
    graded: nextGraded,
    regular: {
      ...(ledger.regular || {}),
      ats,
      ml: ledger.regular?.ml || { hits: 0, misses: 0, pushes: 0, n: 0, rate: null },
      totals: ledger.regular?.totals || { hits: 0, misses: 0, pushes: 0, n: 0, rate: null },
    },
    updated: new Date().toISOString().slice(0, 10),
    target: {
      ats: 0.75,
      minN: 30,
      ...(ledger.target || {}),
      status:
        ats.n < 30
          ? `Not measurable. n=${ats.n} (need 30). Do not quote a 75% rate.`
          : `n=${ats.n} issued rate=${ats.rate} target=0.75`,
    },
  };
  delete nextLedger.edgeBuckets;

  const researchAts = recomputeAts(nextResearch, "hit", "miss", "push");
  const nextResearchLedger = {
    ...research,
    rows: nextResearch,
    ats: researchAts,
    policy:
      "Research grades are library/WATCH observations vs the stored consensus after a final. They are not issued plays. Do not quote them as the 75% issued-ATS target.",
    generatedAt: new Date().toISOString(),
  };

  return { ledger: nextLedger, research: nextResearchLedger };
}

export function gradeResults({ root = DEFAULT_ROOT } = {}) {
  const board = load(root, "src/data/board.json", { issuedPlays: [], watch: [] });
  const ledger = load(root, "src/data/ledger.json", {
    regular: { ats: { hits: 0, misses: 0, pushes: 0, n: 0, rate: null } },
    graded: [],
  });
  const research = load(root, "src/data/research-ledger.json", {
    rows: [],
    ats: { hits: 0, misses: 0, pushes: 0, n: 0, rate: null },
  });
  const next = applyGrades({ board, ledger, research });
  writeJsonAtomic(join(root, "src/data/ledger.json"), next.ledger, { root });
  writeJsonAtomic(join(root, "public/data/ledger.json"), next.ledger, { root });
  writeJsonAtomic(join(root, "src/data/research-ledger.json"), next.research, { root });
  return next;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = gradeResults();
  const ats = out.ledger.regular.ats;
  const r = out.research.ats;
  console.log(
    JSON.stringify({
      issued: `${ats.hits}-${ats.misses}-${ats.pushes}`,
      issuedN: ats.n,
      research: `${r.hits}-${r.misses}-${r.pushes}`,
      researchN: r.n,
    }),
  );
}
