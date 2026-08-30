import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  MAX_CARD_BYTES,
  OG_PENDING_REL_PATH,
  computeBrandWarnings,
  ogPendingActive,
  siteDeclaresOgTypeGame,
} from "./brand-check.mjs";

function makeRoot() {
  return mkdtempSync(join(tmpdir(), "brand-"));
}

test("siteDeclaresOgTypeGame detects x:game", () => {
  assert.equal(siteDeclaresOgTypeGame({ type: "x:game" }), true);
  assert.equal(siteDeclaresOgTypeGame({ type: "website" }), false);
  assert.equal(siteDeclaresOgTypeGame({}), false);
});

test("ogPendingActive respects marker age", () => {
  const root = makeRoot();
  const marker = join(root, OG_PENDING_REL_PATH);
  mkdirSync(join(root, ".grok"), { recursive: true });
  writeFileSync(marker, "");
  assert.equal(ogPendingActive(root), true);
  const old = Date.now() / 1000 - 11 * 60;
  utimesSync(marker, old, old);
  assert.equal(ogPendingActive(root, Date.now()), false);
});

test("computeBrandWarnings is silent while generation is pending", () => {
  const root = makeRoot();
  mkdirSync(join(root, ".grok"), { recursive: true });
  writeFileSync(join(root, OG_PENDING_REL_PATH), "");
  assert.deepEqual(computeBrandWarnings({ hasCanvas: true, workspaceRoot: root }), []);
});

test("computeBrandWarnings reports missing card when canvas is present", () => {
  const root = makeRoot();
  const warnings = computeBrandWarnings({ hasCanvas: true, workspaceRoot: root });
  assert.ok(warnings.some((w) => /missing public\/og\.jpg/.test(w)));
});

test("MAX_CARD_BYTES is 600KB", () => {
  assert.equal(MAX_CARD_BYTES, 600 * 1024);
});
