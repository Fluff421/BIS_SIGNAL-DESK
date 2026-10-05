import assert from "node:assert/strict";
import test from "node:test";
import { applyGrades } from "./grade-results.mjs";

const issuedRow = {
  eventId: "iss-1",
  league: "NFL",
  kick: "2026-09-20T17:00:00.000Z",
  away: "Away Pro",
  home: "Home Pro",
  marketHome: -3,
  modelHome: 1,
  edge: 4,
  edgeTo: "Home Pro",
  approvedSide: "home",
  completed: true,
  status: "complete",
  homePoints: 24,
  awayPoints: 17,
};

const watchRow = {
  eventId: "watch-1",
  league: "NCAAF",
  kick: "2026-09-20T19:00:00.000Z",
  away: "Away U",
  home: "Home U",
  marketHome: -7,
  modelHome: -3,
  edge: 4,
  edgeTo: "Away U",
  dataClass: "WATCH",
  completed: true,
  status: "complete",
  homePoints: 31,
  awayPoints: 10,
};

test("watch finals go to research and do not increment issued ATS", () => {
  const out = applyGrades({
    board: { issuedPlays: [], watch: [watchRow], highNoise: [], staleFpi: [] },
    ledger: { regular: { ats: { hits: 0, misses: 0, pushes: 0, n: 0, rate: null } }, graded: [] },
    research: { rows: [], ats: { hits: 0, misses: 0, pushes: 0, n: 0, rate: null } },
  });
  assert.equal(out.ledger.regular.ats.n, 0);
  assert.equal(out.ledger.graded.length, 0);
  assert.equal(out.research.rows.length, 1);
  assert.equal(out.research.rows[0].class, "RESEARCH");
  assert.equal(out.research.ats.n, 1);
});

test("issued finals grade into the issued book only", () => {
  const out = applyGrades({
    board: { issuedPlays: [issuedRow], watch: [watchRow], highNoise: [], staleFpi: [] },
    ledger: { regular: { ats: { hits: 0, misses: 0, pushes: 0, n: 0, rate: null } }, graded: [] },
    research: { rows: [], ats: { hits: 0, misses: 0, pushes: 0, n: 0, rate: null } },
  });
  assert.equal(out.ledger.graded.length, 1);
  assert.equal(out.ledger.graded[0].class, "ISSUED");
  assert.equal(out.ledger.regular.ats.n, 1);
  assert.equal(out.ledger.regular.ats.hits, 1);
  assert.equal(out.research.rows.length, 1);
  assert.equal(out.research.ats.n, 1);
});

test("contaminated auto-graded watch rows are dropped from issued ATS", () => {
  const out = applyGrades({
    board: { issuedPlays: [], watch: [watchRow], highNoise: [], staleFpi: [] },
    ledger: {
      regular: { ats: { hits: 15, misses: 13, pushes: 1, n: 29, rate: 0.536 } },
      graded: [
        {
          kick: "2026-09-24T23:30:00.000Z",
          away: "Liberty Flames",
          home: "Coastal Carolina Chanticleers",
          result: "WIN",
          note: "auto-graded",
          confidence: "WATCH",
        },
      ],
      edgeBuckets: { "3-7": { hits: 5, misses: 4, pushes: 1 } },
    },
    research: { rows: [], ats: { hits: 0, misses: 0, pushes: 0, n: 0, rate: null } },
  });
  assert.equal(out.ledger.graded.length, 0);
  assert.equal(out.ledger.regular.ats.n, 0);
  assert.equal(out.ledger.regular.ats.hits, 0);
  assert.equal(out.ledger.regular.ats.rate, null);
  assert.equal(out.ledger.edgeBuckets, undefined);
  assert.equal(out.research.rows.length, 1);
});
