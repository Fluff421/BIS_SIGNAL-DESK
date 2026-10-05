import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCandidate, GATES } from "../src/lib/gates.ts";

const now = Date.parse("2026-09-27T20:00:00Z");

const good = {
  observedAt: "2026-09-27T12:00:00Z",
  nBooks: 5,
  fpiAgeHours: 6,
  teamMatchWarning: false,
  unresolvedContext: false,
  dataClass: "WATCH",
  edge: 4.2,
  bandValidated: true,
  storedLine: true,
  humanReview: "none",
  gradedN: 0,
  kick: "2026-10-04T17:00:00.000Z",
  lowLiquidity: false,
};

function ids(result) {
  return result.gates.filter((g) => g.status !== "pass").map((g) => g.id);
}

test("pass: every hard gate green with n=0 issued", () => {
  const r = evaluateCandidate(good, now);
  assert.equal(r.allHardGreen, true);
  assert.equal(r.quote75Allowed, false);
  assert.deepEqual(ids(r), []);
  assert.equal(GATES.minBooks, 3);
});

test("fail: missing stored line", () => {
  const r = evaluateCandidate({ ...good, storedLine: false }, now);
  assert.equal(r.allHardGreen, false);
  assert.ok(ids(r).includes("stored_line"));
});

test("fail: edge outside 3-to-under-7 band", () => {
  const low = evaluateCandidate({ ...good, edge: 2.9, bandValidated: false }, now);
  const high = evaluateCandidate({ ...good, edge: 7, bandValidated: false }, now);
  assert.equal(low.allHardGreen, false);
  assert.equal(high.allHardGreen, false);
  assert.ok(ids(low).includes("edge_band"));
  assert.ok(ids(high).includes("edge_band"));
});

test("fail: dataClass other than WATCH", () => {
  for (const dataClass of ["HIGH_NOISE", "STALE_FPI", "ALIGNED", "LIBRARY"]) {
    const r = evaluateCandidate({ ...good, dataClass }, now);
    assert.equal(r.allHardGreen, false, dataClass);
    assert.ok(ids(r).includes("data_class"), dataClass);
  }
});

test("fail: teamMatchWarning", () => {
  const r = evaluateCandidate({ ...good, teamMatchWarning: true }, now);
  assert.equal(r.allHardGreen, false);
  assert.ok(ids(r).includes("team_match"));
});

test("fail: unresolvedContext", () => {
  const r = evaluateCandidate({ ...good, unresolvedContext: true }, now);
  assert.equal(r.allHardGreen, false);
  assert.ok(ids(r).includes("context"));
});

test("fail: nBooks below the 3-book floor / lowLiquidity", () => {
  const books = evaluateCandidate({ ...good, nBooks: 2 }, now);
  const liq = evaluateCandidate({ ...good, nBooks: 8, lowLiquidity: true }, now);
  assert.equal(books.allHardGreen, false);
  assert.equal(liq.allHardGreen, false);
  assert.ok(ids(books).includes("books"));
  assert.ok(ids(liq).includes("books"));
});

test("kickoff lock: past kick fails; future kick passes", () => {
  const past = evaluateCandidate({ ...good, kick: "2026-09-20T17:00:00.000Z" }, now);
  const future = evaluateCandidate({ ...good, kick: "2026-10-04T17:00:00.000Z" }, now);
  assert.equal(past.allHardGreen, false);
  assert.ok(ids(past).includes("kickoff"));
  assert.equal(future.allHardGreen, true);
});

test("n>=30 is quote75Allowed only — not inside allHardGreen", () => {
  const zero = evaluateCandidate({ ...good, gradedN: 0 }, now);
  const thirty = evaluateCandidate({ ...good, gradedN: 30 }, now);
  assert.equal(zero.allHardGreen, true);
  assert.equal(zero.quote75Allowed, false);
  assert.equal(thirty.allHardGreen, true);
  assert.equal(thirty.quote75Allowed, true);
});

test("humanReview is not a pre-green gate", () => {
  const none = evaluateCandidate({ ...good, humanReview: "none" }, now);
  const approved = evaluateCandidate({ ...good, humanReview: "approved" }, now);
  assert.equal(none.allHardGreen, true);
  assert.equal(approved.allHardGreen, true);
  assert.ok(!ids(none).includes("human_review_required"));
});
