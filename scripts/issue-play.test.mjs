import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { issuePlay, parseIssueArgs } from "./issue-play.mjs";

const FUTURE = "2027-01-10T18:00:00.000Z";
const PAST = "2026-09-01T18:00:00.000Z";
const NOW = Date.parse("2026-09-27T20:00:00Z");

function writeJson(path, obj) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

function watchRow(over = {}) {
  return {
    league: "NFL",
    kick: FUTURE,
    away: "Buffalo Bills",
    home: "Kansas City Chiefs",
    neutral: false,
    marketHome: -3.5,
    modelHome: 0.8,
    edgeTo: "Kansas City Chiefs",
    edge: 4.3,
    total: 47.5,
    note: "fixture",
    eventId: "evt-test-1",
    observedAt: "2026-09-27T12:00:00.000Z",
    dataClass: "WATCH",
    nBooks: 6,
    lowLiquidity: false,
    teamMatchWarning: false,
    humanReview: "none",
    ...over,
  };
}

function fixtureRoot(row = watchRow()) {
  const root = mkdtempSync(join(tmpdir(), "bis-issue-"));
  mkdirSync(join(root, "src/data"), { recursive: true });
  mkdirSync(join(root, "public/data"), { recursive: true });
  const board = {
    issuedPlays: [],
    watch: [row],
    highNoise: [],
    staleFpi: [],
    observe: [row],
    library: [],
    aligned: [],
    counts: { watch: 1, issued: 0 },
    updated: "2026-09-27T12:00:00.000Z",
  };
  writeJson(join(root, "src/data/board.json"), board);
  writeJson(join(root, "public/data/board.json"), board);
  writeJson(join(root, "src/data/injuries.json"), {
    nfl: [
      { team: "Kansas City Chiefs", qb: [], notable: [], reportCount: 1 },
      { team: "Buffalo Bills", qb: [], notable: [], reportCount: 1 },
    ],
    ncaaf: [],
  });
  writeJson(join(root, "src/data/snapshot.json"), { asOf: "2026-09-27T12:00:00.000Z" });
  writeJson(join(root, "src/data/ledger.json"), { regular: { ats: { n: 0 } } });
  return root;
}

function readBoard(root, rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

test("refuse-without-side", () => {
  const parsed = parseIssueArgs(["--event", "evt-test-1", "--note", "why"]);
  assert.equal(parsed.error, "missing --side");
});

test("refuse-on-red-gate", () => {
  const root = fixtureRoot(watchRow({ nBooks: 1, lowLiquidity: true }));
  const result = issuePlay({
    event: "evt-test-1",
    side: "home",
    note: "should fail",
    root,
    now: NOW,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /hard gate red/);
  assert.equal(readBoard(root, "src/data/board.json").issuedPlays.length, 0);
  rmSync(root, { recursive: true, force: true });
});

test("refuse-after-kick", () => {
  const root = fixtureRoot(watchRow({ kick: PAST }));
  const result = issuePlay({
    event: "evt-test-1",
    side: "away",
    note: "too late",
    root,
    now: NOW,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /hard gate red/);
  assert.ok(result.gate.gates.some((g) => g.id === "kickoff" && g.status === "fail"));
  rmSync(root, { recursive: true, force: true });
});

test("success writes both board files identically and leaves watch", () => {
  const root = fixtureRoot();
  const result = issuePlay({
    event: "evt-test-1",
    side: "home",
    note: "human approved before kick",
    root,
    now: NOW,
  });
  assert.equal(result.ok, true);
  const src = readBoard(root, "src/data/board.json");
  const pub = readBoard(root, "public/data/board.json");
  assert.equal(JSON.stringify(src), JSON.stringify(pub));
  assert.equal(src.issuedPlays.length, 1);
  assert.equal(src.watch.length, 0);
  assert.equal(src.issuedPlays[0].approvedSide, "home");
  assert.equal(src.issuedPlays[0].issueNote, "human approved before kick");
  assert.ok(src.issuedPlays[0].gateSnapshot.allHardGreen);
  assert.equal(src.issuedPlays[0].preIssue.eventId, "evt-test-1");
  rmSync(root, { recursive: true, force: true });
});

test("idempotent second issue", () => {
  const root = fixtureRoot();
  const first = issuePlay({
    event: "evt-test-1",
    side: "away",
    note: "first",
    root,
    now: NOW,
  });
  assert.equal(first.ok, true);
  const second = issuePlay({
    event: "evt-test-1",
    side: "away",
    note: "first",
    root,
    now: NOW,
  });
  assert.equal(second.ok, false);
  assert.equal(second.error, "already issued");
  assert.equal(readBoard(root, "src/data/board.json").issuedPlays.length, 1);
  rmSync(root, { recursive: true, force: true });
});
