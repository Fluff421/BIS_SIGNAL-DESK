import assert from "node:assert/strict";
import { test } from "node:test";
import {
  looksLikePreviewProcess,
  parseListenerInodes,
  parsePgid,
  parsePid,
  parsePreviewArgs,
  previewOwners,
  stopOutcome,
  terminatePids,
} from "./preview.mjs";

test("parsePreviewArgs accepts the two actions", () => {
  for (const action of ["stop", "restart"]) {
    assert.deepEqual(parsePreviewArgs([action]), { action });
  }
});

test("parsePreviewArgs rejects missing, unknown and extra arguments", () => {
  assert.match(parsePreviewArgs([]).error, /usage:/);
  assert.match(parsePreviewArgs(["reload"]).error, /unknown action: reload/);
  assert.match(parsePreviewArgs(["start"]).error, /unknown action: start/);
  assert.match(parsePreviewArgs(["restart", "--force"]).error, /unexpected argument: --force/);
});

test("parsePid reads a pidfile and rejects junk", () => {
  assert.equal(parsePid("4321\n"), 4321);
  assert.equal(parsePid("  99  "), 99);
  assert.equal(parsePid(""), null);
  assert.equal(parsePid("not-a-pid"), null);
  assert.equal(parsePid("-7"), null);
  assert.equal(parsePid("1"), null);
});

test("parsePgid reads the pgrp field past a comm containing spaces", () => {
  assert.equal(parsePgid("4321 (node) S 4300 4321 4321 0 -1 4194304 1234"), 4321);
  assert.equal(parsePgid("4321 (npm run preview) S 4300 4200 4200 0 -1 0 0"), 4200);
  assert.equal(parsePgid("4321 (weird ) name) S 4300 4200 4200 0"), 4200);
  assert.equal(parsePgid("garbage"), null);
  assert.equal(parsePgid(""), null);
  assert.equal(parsePgid(undefined), null);
});

const tcpRow = (sl, local, state, inode) =>
  [
    `  ${sl}:`,
    local,
    "00000000:0000",
    state,
    "00000000:00000000",
    "00:00000000",
    "00000000",
    "1000",
    "0",
    inode,
    "1",
    "0000",
    "100",
  ].join(" ");

test("parseListenerInodes picks LISTEN sockets on the wanted port only", () => {
  const port = 8081;
  const hex = port.toString(16).toUpperCase().padStart(4, "0");
  const dump = [
    "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode",
    tcpRow(0, `0100007F:${hex}`, "0A", "12345"),
    tcpRow(1, `0100007F:${hex}`, "01", "99999"),
    tcpRow(2, `0100007F:1F90", "0A", "11111"),
  ].join("\n");
  assert.deepEqual(parseListenerInodes(dump, port), ["12345"]);
});

test("looksLikePreviewProcess matches the npm wrapper and its vite child", () => {
  assert.equal(looksLikePreviewProcess("node\0/usr/bin/npm\0run\0preview\0"), true);
  assert.equal(looksLikePreviewProcess("node\0./node_modules/.bin/vite\0preview\0"), true);
  assert.equal(looksLikePreviewProcess("node\0scripts/preview.mjs\0stop\0"), false);
  assert.equal(looksLikePreviewProcess("node\0scripts/preview-thumbnail.mjs\0"), false);
});

test("previewOwners trusts port owners and dedupes the pidfile pid", () => {
  const owners = previewOwners({
    portPids: [100, 200],
    pidFilePid: 100,
    cmdlineOf: () => "node\0npm\0run\0preview\0",
  });
  assert.deepEqual([...owners].sort(), [100, 200]);
});

test("previewOwners drops a stale pidfile pid re-used by another process", () => {
  const owners = previewOwners({
    portPids: [],
    pidFilePid: 50,
    cmdlineOf: () => "node\0some-other-server\0",
  });
  assert.deepEqual(owners, []);
});

test("stopOutcome fails when a pid survives or the port is still held", () => {
  assert.equal(stopOutcome({ signalled: [1], stubborn: [1], after: [] }).ok, false);
  assert.equal(stopOutcome({ signalled: [1], stubborn: [], after: [9] }).ok, false);
});

test("stopOutcome reports a verified free port", () => {
  assert.equal(stopOutcome({ signalled: [1], stubborn: [], after: [] }).ok, true);
});

test("terminatePids SIGTERMs live pids and skips dead ones", async () => {
  const killed = [];
  const alive = new Set([10, 20]);
  const result = await terminatePids([10, 20, 30], {
    kill: (pid, sig) => killed.push([pid, sig]),
    isAlive: (pid) => alive.has(pid),
    sleep: async () => {
      alive.clear();
    },
    graceMs: 10,
    pollMs: 5,
  });
  assert.deepEqual(result.signalled, [10, 20]);
  assert.deepEqual(result.stubborn, []);
});
