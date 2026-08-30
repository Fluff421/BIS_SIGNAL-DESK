import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { handOver, parseWriteAtomicArgs, stagingError } from "./write-atomic.mjs";

const TEMPLATE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(TEMPLATE_ROOT, "scripts/write-atomic.mjs");

function makeWorkspace() {
  const root = mkdtempSync(join(tmpdir(), "write-atomic-"));
  mkdirSync(join(root, "public"), { recursive: true });
  mkdirSync(join(root, ".grok"), { recursive: true });
  return root;
}

test("parseWriteAtomicArgs needs exactly a staged file and a target", () => {
  assert.deepEqual(parseWriteAtomicArgs([".grok/og.tmp", "public/og.jpg"]), {
    staged: ".grok/og.tmp",
    target: "public/og.jpg",
  });
  assert.match(parseWriteAtomicArgs([]).error, /usage:/);
  assert.match(parseWriteAtomicArgs([".grok/og.tmp"]).error, /usage:/);
  assert.match(parseWriteAtomicArgs(["a", "b", "c"]).error, /unexpected argument: c/);
});

test("stagingError refuses a temp inside public/ and a no-op move", () => {
  const publicDir = "/workspace/public";
  assert.equal(
    stagingError({
      staged: "/workspace/.grok/og.jpg.tmp",
      target: "/workspace/public/og.jpg",
      publicDir,
    }),
    null,
  );
  assert.match(
    stagingError({
      staged: "/workspace/public/og.jpg.tmp",
      target: "/workspace/public/og.jpg",
      publicDir,
    }),
    /stage outside/,
  );
  assert.match(
    stagingError({
      staged: "/workspace/public/og.jpg",
      target: "/workspace/public/og.jpg",
      publicDir,
    }),
    /same path/,
  );
});

test("handOver renames staged onto target", () => {
  const root = makeWorkspace();
  const staged = join(root, ".grok/og.jpg.tmp");
  const target = join(root, "public/og.jpg");
  writeFileSync(staged, "new card");
  handOver(staged, target);
  assert.equal(readFileSync(target, "utf8"), "new card");
  assert.equal(existsSync(staged), false);
});

test("cli: a missing staged file fails without touching the target", () => {
  const root = makeWorkspace();
  writeFileSync(join(root, "public/og.jpg"), "old card");
  const run = spawnSync(
    process.execPath,
    [SCRIPT, join(root, ".grok/absent.tmp"), join(root, "public/og.jpg")],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 1);
  assert.equal(readFileSync(join(root, "public/og.jpg"), "utf8"), "old card");
});
