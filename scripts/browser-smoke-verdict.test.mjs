import assert from "node:assert/strict";
import { test } from "node:test";
import { formatVerdict, smokeVerdict } from "./browser-smoke-verdict.mjs";

test("smokeVerdict passes when all ok", () => {
  const v = smokeVerdict([{ ok: true }, { ok: true }]);
  assert.equal(v.ok, true);
  assert.equal(v.failed, 0);
  assert.equal(v.total, 2);
});

test("smokeVerdict fails when any not ok", () => {
  const v = smokeVerdict([{ ok: true }, { ok: false, name: "home" }]);
  assert.equal(v.ok, false);
  assert.equal(v.failed, 1);
  assert.equal(v.failures.length, 1);
});

test("smokeVerdict on empty is pass", () => {
  const v = smokeVerdict([]);
  assert.equal(v.ok, true);
  assert.equal(v.total, 0);
});

test("formatVerdict strings", () => {
  assert.match(formatVerdict(smokeVerdict([{ ok: true }])), /PASS/);
  assert.match(formatVerdict(smokeVerdict([{ ok: false }])), /FAIL/);
});
