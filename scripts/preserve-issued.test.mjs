import assert from "node:assert/strict";
import test from "node:test";
import { dropIssuedFromList, preserveIssuedPlays } from "./preserve-issued.mjs";

const issued = {
  eventId: "evt-keep",
  kick: "2026-10-01T00:20:00.000Z",
  away: "Away U",
  home: "Home U",
  marketHome: -3.5,
  dataClass: "WATCH",
  approvedSide: "home",
  issuedAt: "2026-09-25T12:00:00.000Z",
  issueNote: "human",
  edge: 4.1,
};

test("universe rebuild with issuedPlays: [] still writes the previous issued row", () => {
  const prev = { issuedPlays: [issued] };
  const rebuilt = {
    issuedPlays: [],
    watch: [
      {
        eventId: "evt-keep",
        kick: issued.kick,
        away: issued.away,
        home: issued.home,
        marketHome: -3,
        homePoints: 24,
        awayPoints: 17,
        status: "complete",
        completed: true,
      },
    ],
  };
  rebuilt.issuedPlays = preserveIssuedPlays(prev.issuedPlays, rebuilt);
  rebuilt.watch = dropIssuedFromList(rebuilt.watch, rebuilt.issuedPlays);
  assert.equal(rebuilt.issuedPlays.length, 1);
  assert.equal(rebuilt.issuedPlays[0].approvedSide, "home");
  assert.equal(rebuilt.issuedPlays[0].issuedAt, issued.issuedAt);
  assert.equal(rebuilt.issuedPlays[0].homePoints, 24);
  assert.equal(rebuilt.issuedPlays[0].closingMarketHome, -3);
  assert.equal(rebuilt.watch.length, 0);
});

test("missing eventId falls back to kick+home+away", () => {
  const prevRow = { ...issued, eventId: undefined };
  const rebuilt = {
    issuedPlays: [],
    watch: [{ kick: prevRow.kick, home: prevRow.home, away: prevRow.away, status: "in" }],
  };
  const kept = preserveIssuedPlays([prevRow], rebuilt);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].approvedSide, "home");
  assert.equal(kept[0].status, "in");
});
