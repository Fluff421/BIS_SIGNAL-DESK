import assert from "node:assert/strict";
import test from "node:test";
import { wilsonInterval } from "./stats.ts";

test("wilson is undefined for n=0", () => {
  assert.equal(wilsonInterval(0, 0), null);
});

test("wilson contains the sample rate and is not a point", () => {
  const iv = wilsonInterval(328, 612);
  assert.ok(iv);
  assert.ok(iv.lo < iv.p && iv.p < iv.hi);
  assert.ok(iv.lo > 0.48 && iv.hi < 0.59);
});
