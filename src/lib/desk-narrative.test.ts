import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { composeDeskBrief } from "./desk-narrative.ts";

describe("composeDeskBrief", () => {
  it("never calls a disagreement a bet and states n=0", () => {
    const text = composeDeskBrief({
      week: 1,
      season: 2026,
      watch: 15,
      highNoise: 15,
      staleFpi: 21,
      issued: 0,
      gradedN: 0,
      atsHits: 0,
      atsMisses: 0,
      atsPushes: 0,
      helpers: ["15 rows in primary WATCH band after suppression."],
      hurters: ["Grok narrative unavailable; ignore this.", "Ensemble remains unfitted."],
      topGames: [
        {
          matchup: "Miami Dolphins @ Las Vegas Raiders",
          league: "NFL",
          edge: 6.7,
          edgeTo: "Las Vegas Raiders",
          nBooks: 5,
        },
      ],
      espnNcaafFinals: 21,
      espnNflEvents: 16,
      backtestAts: 0.512,
      backtestN: 2764,
      engine: "FPI + HFA only",
    });
    assert.match(text, /n=0/);
    assert.match(text, /not measurable/);
    assert.match(text, /WATCH/);
    assert.doesNotMatch(text, /\bbet\b/i);
    assert.doesNotMatch(text, /grok narrative unavailable/i);
    assert.match(text, /grok-4.6-desk|FPI \+ HFA/i);
  });
});
