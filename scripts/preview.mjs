#!/usr/bin/env node
/** Owns :8081, the built-output QA preview. */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PREVIEW_PORT = 8081;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function parsePreviewArgs(argv) {
  const [action, ...rest] = argv;
  if (!action) return { error: "usage: node scripts/preview.mjs stop|restart" };
  if (rest.length > 0) return { error: `unexpected argument: ${rest[0]}` };
  if (!["stop", "restart"].includes(action)) {
    return { error: `unknown action: ${action} (expected stop or restart)` };
  }
  return { action };
}

export function parsePid(text) {
  const pid = Number.parseInt(String(text ?? "").trim(), 10);
  return Number.isInteger(pid) && pid > 1 ? pid : null;
}

export function parsePgid(stat) {
  const line = String(stat ?? "");
  const end = line.lastIndexOf(") ");
  if (end === -1) return null;
  const pgid = Number.parseInt(line.slice(end + 2).split(/\s+/)[2], 10);
  return Number.isInteger(pgid) && pgid > 0 ? pgid : null;
}

const TCP_LISTEN = "0A";

export function parseListenerInodes(procNetTcp, port) {
  const wanted = `:${port.toString(16).toUpperCase().padStart(4, "0")}`;
  const inodes = [];
  for (const line of String(procNetTcp ?? "").split("\n")) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 10 || cols[3] !== TCP_LISTEN || !cols[1].endsWith(wanted)) continue;
    if (/^\d+$/.test(cols[9])) inodes.push(cols[9]);
  }
  return inodes;
}

export function looksLikePreviewProcess(cmdline) {
  const argv = String(cmdline ?? "")
    .split("\0")
    .filter(Boolean)
    .join(" ");
  if (/\bpreview[\w-]*\.mjs\b/.test(argv)) return false;
  return /\brun\s+preview(?:\s|$)/.test(argv) || /\bvite\b\s+preview\b/.test(argv);
}

export function previewOwners({ portPids, pidFilePid, cmdlineOf }) {
  const owners = new Set(portPids);
  if (
    pidFilePid !== null &&
    !owners.has(pidFilePid) &&
    looksLikePreviewProcess(cmdlineOf(pidFilePid))
  ) {
    owners.add(pidFilePid);
  }
  return [...owners];
}

export async function terminatePids(
  pids,
  { kill, isAlive, sleep, graceMs = 3000, pollMs = 100 } = {},
) {
  const signalled = [];
  for (const pid of pids) {
    if (!isAlive(pid)) continue;
    try {
      kill(pid, "SIGTERM");
      signalled.push(pid);
    } catch {
      /* already gone */
    }
  }
  let remaining = signalled.filter((pid) => isAlive(pid));
  for (let waited = 0; remaining.length > 0 && waited < graceMs; waited += pollMs) {
    await sleep(pollMs);
    remaining = remaining.filter((pid) => isAlive(pid));
  }
  for (const pid of remaining) {
    try {
      kill(pid, "SIGKILL");
    } catch {
      /* ignore */
    }
  }
  await sleep(pollMs);
  const stubborn = remaining.filter((pid) => isAlive(pid));
  return { signalled, stubborn };
}

export function stopOutcome({ signalled, stubborn, after }) {
  if ((stubborn && stubborn.length > 0) || (after && after.length > 0)) {
    return { ok: false, signalled, stubborn, after };
  }
  return { ok: true, signalled: signalled ?? [], stubborn: [], after: [] };
}

if (process.argv[1]?.endsWith("preview.mjs")) {
  const parsed = parsePreviewArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(parsed.error);
    process.exit(2);
  }
  console.log(JSON.stringify({ ok: true, action: parsed.action, port: PREVIEW_PORT, root: ROOT }));
}
