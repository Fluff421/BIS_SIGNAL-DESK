import assert from "node:assert/strict";
import test from "node:test";
import { canIssue, classifyEdge, evaluateCandidate, GATES, gradeSide } from "./gates.ts";

const now = Date.parse("2026-09-27T20:00:00Z");
const good = {
  observedAt: "2026-09-27T12:00:00Z",
  nBooks: 5,
  teamMatchWarning: false,
  unresolvedContext: false,
  dataClass: "WATCH",
  edge: 4.2,
  bandValidated: true,
  storedLine: true,
  humanReview: "none",
  gradedN: 0,
  kick: "2026-10-04T17:00:00.000Z",
};

test("classifyEdge bands", () => {
  assert.equal(classifyEdge(46, 24), "STALE_FPI");
  assert.equal(classifyEdge(8, 7), "HIGH_NOISE");
  assert.equal(classifyEdge(4.5, 6.5), "WATCH");
});

test("hard gates pass without n>=30 or humanReview", () => {
  assert.equal(canIssue(good, now), true);
  assert.equal(GATES.minBooks, 3);
  const r = evaluateCandidate({ ...good, gradedN: 0, humanReview: "none" }, now);
  assert.equal(r.allHardGreen, true);
  assert.equal(r.quote75Allowed, false);
});

test("quote75Allowed is independent of allHardGreen", () => {
  const r = evaluateCandidate({ ...good, gradedN: 30 }, now);
  assert.equal(r.allHardGreen, true);
  assert.equal(r.quote75Allowed, true);
});

test("grading win/loss/push", () => {
  const homeWin = gradeSide(-3.5, 7, "Ohio State", "Ohio State", "Michigan");
  assert.equal(homeWin.result, "WIN");
  const push = gradeSide(-7, 7, "Ohio State", "Ohio State", "Michigan");
  assert.equal(push.result, "PUSH");
});
