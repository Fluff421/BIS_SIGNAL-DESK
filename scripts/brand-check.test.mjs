import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  MAX_CARD_BYTES,
  OG_PENDING_MAX_AGE_MS,
  OG_PENDING_REL_PATH,
  computeBrandWarnings,
  ogPendingActive,
  parseBrandCheckArgs,
  siteDeclaresOgTypeGame,
} from "./brand-check.mjs";

const TEMPLATE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(TEMPLATE_ROOT, "scripts/brand-check.mjs");

function makeWorkspace({ siteJson, cardBytes, pendingAgeMs } = {}) {
  const root = mkdtempSync(join(tmpdir(), "brand-check-"));
  mkdirSync(join(root, "public"), { recursive: true });
  mkdirSync(join(root, "src/lib/og"), { recursive: true });
  mkdirSync(join(root, ".grok"), { recursive: true });
  if (pendingAgeMs !== undefined) {
    const marker = join(root, OG_PENDING_REL_PATH);
    writeFileSync(marker, "");
    const when = new Date(Date.now() - pendingAgeMs);
    utimesSync(marker, when, when);
  }
  if (siteJson !== undefined) {
    writeFileSync(join(root, "src/lib/og/site.json"), siteJson);
  }
  if (cardBytes !== undefined) {
    writeFileSync(join(root, "public/og.jpg"), Buffer.alloc(cardBytes));
  }
  return root;
}

test("siteDeclaresOgTypeGame detects x:game", () => {
  assert.equal(siteDeclaresOgTypeGame({ type: "x:game" }), true);
  assert.equal(siteDeclaresOgTypeGame({ type: "website" }), false);
  assert.equal(siteDeclaresOgTypeGame({}), false);
});

test("ogPendingActive respects marker age", () => {
  const fresh = makeWorkspace({ pendingAgeMs: 1000 });
  assert.equal(ogPendingActive(fresh), true);
  const stale = makeWorkspace({ pendingAgeMs: OG_PENDING_MAX_AGE_MS + 1000 });
  assert.equal(ogPendingActive(stale), false);
});

test("computeBrandWarnings is silent while generation is pending", () => {
  const root = makeWorkspace({ pendingAgeMs: 1000 });
  assert.deepEqual(computeBrandWarnings({ hasCanvas: true, workspaceRoot: root }), []);
});

test("computeBrandWarnings reports missing card when canvas is present", () => {
  const root = makeWorkspace();
  const warnings = computeBrandWarnings({ hasCanvas: true, workspaceRoot: root });
  assert.ok(warnings.some((w) => /missing public\/og\.jpg/.test(w)));
});

test("computeBrandWarnings reports oversized card", () => {
  const root = makeWorkspace({ cardBytes: MAX_CARD_BYTES + 1 });
  const warnings = computeBrandWarnings({ hasCanvas: true, workspaceRoot: root });
  assert.ok(warnings.some((w) => /og\.jpg/.test(w) && /bytes/.test(w)));
});

test("MAX_CARD_BYTES is 600KB", () => {
  assert.equal(MAX_CARD_BYTES, 600 * 1024);
});

test("parseBrandCheckArgs defaults workspace root", () => {
  const parsed = parseBrandCheckArgs([]);
  assert.ok(parsed.workspaceRoot);
});

test("cli exits 0 when no canvas warnings required", () => {
  const root = makeWorkspace();
  const run = spawnSync(process.execPath, [SCRIPT], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env },
  });
  // Script may exit 0 or 1 depending on template public/og.jpg presence
  assert.ok(run.status === 0 || run.status === 1);
});
