#!/usr/bin/env node
/**
 * Human issuance. The browser is not the source of truth.
 *
 *   npm run issue:play -- --event "<id>" --side home|away --note "why"
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildCandidateInput, evaluateCandidate, unresolvedContextFor } from "../src/lib/gates.ts";
import { writeJsonAtomic } from "./write-atomic.mjs";

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function parseIssueArgs(argv) {
  const out = { event: null, side: null, note: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--event") out.event = argv[++i];
    else if (a === "--side") out.side = argv[++i];
    else if (a === "--note") out.note = argv[++i];
    else if (a.startsWith("--event=")) out.event = a.slice(8);
    else if (a.startsWith("--side=")) out.side = a.slice(7);
    else if (a.startsWith("--note=")) out.note = a.slice(7);
  }
  if (!out.event) return { error: "missing --event" };
  if (!out.side) return { error: "missing --side" };
  if (out.note == null || String(out.note).trim() === "") return { error: "missing --note" };
  if (out.side !== "home" && out.side !== "away") return { error: "--side must be home or away" };
  return out;
}

function loadJson(root, rel) {
  const p = join(root, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

export function issuePlay({ event, side, note, root = DEFAULT_ROOT, now = Date.now(), fpiAgeHours = 0 }) {
  if (!event) return { ok: false, error: "missing --event" };
  if (!side) return { ok: false, error: "missing --side" };
  if (note == null || String(note).trim() === "") return { ok: false, error: "missing --note" };
  if (side !== "home" && side !== "away") return { ok: false, error: "--side must be home or away" };

  const board = loadJson(root, "src/data/board.json");
  if (!board) return { ok: false, error: "board.json missing" };
  board.issuedPlays = Array.isArray(board.issuedPlays) ? board.issuedPlays : [];
  board.watch = Array.isArray(board.watch) ? board.watch : [];

  if (board.issuedPlays.some((r) => r.eventId === event)) {
    return { ok: false, error: "already issued" };
  }

  const matches = board.watch.filter((r) => r.eventId === event);
  if (!matches.length) return { ok: false, error: "event not in watch" };
  if (matches.length > 1) return { ok: false, error: "ambiguous eventId" };
  const row = matches[0];
  if (row.dataClass !== "WATCH") return { ok: false, error: "dataClass is not WATCH" };

  const injuries = loadJson(root, "src/data/injuries.json") || { nfl: [], ncaaf: [] };
  const snapshot = loadJson(root, "src/data/snapshot.json") || {};
  const ledger = loadJson(root, "src/data/ledger.json") || { regular: { ats: { n: 0 } } };
  const age =
    fpiAgeHours ||
    Math.max(0, (now - Date.parse(snapshot.asOf || new Date(now).toISOString())) / 3_600_000);
  const input = buildCandidateInput(row, {
    fpiAgeHours: Number.isFinite(age) ? age : 0,
    unresolvedContext: unresolvedContextFor(row, injuries),
    gradedN: ledger.regular?.ats?.n ?? 0,
  });
  const gate = evaluateCandidate(input, now);
  if (!gate.allHardGreen) {
    const red = gate.gates.filter((g) => g.status !== "pass").map((g) => g.id);
    return { ok: false, error: `hard gate red: ${red.join(",")}`, gate };
  }

  const issued = {
    ...row,
    issuedAt: new Date(now).toISOString(),
    approvedSide: side,
    sidePrice: row.marketHome ?? null,
    gateSnapshot: gate,
    issueNote: String(note).trim(),
    preIssue: { ...row },
    humanReview: "approved",
    dataClass: "ISSUED",
  };
  board.watch = board.watch.filter((r) => r.eventId !== event);
  board.issuedPlays = [...board.issuedPlays, issued];
  board.counts = { ...(board.counts || {}), issued: board.issuedPlays.length, watch: board.watch.length };

  writeJsonAtomic(join(root, "src/data/board.json"), board, { root });
  writeJsonAtomic(join(root, "public/data/board.json"), board, { root });
  return { ok: true, issued, board };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseIssueArgs(process.argv.slice(2));
  if (args.error) {
    console.error(args.error);
    process.exit(1);
  }
  const result = issuePlay({ ...args, root: process.env.BIS_ROOT || DEFAULT_ROOT });
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      event: result.issued.eventId,
      side: result.issued.approvedSide,
      issuedAt: result.issued.issuedAt,
    }),
  );
}
