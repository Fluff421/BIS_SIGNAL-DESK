#!/usr/bin/env node
/**
 * Human issuance. A watched game can become a play from the desk or this script.
 *
 *   npm run issue:play -- --event "<id>" --side home|away --note "why"
 *
 * side accepts home, away, "Home ", or either club's name.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildCandidateInput, evaluateCandidate, unresolvedContextFor } from "../src/lib/gates.ts";
import { writeJsonAtomic } from "./write-atomic.mjs";

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** home / away words, ignoring case and surrounding space. */
export function normalizeSideWord(side) {
  const s = String(side || "").trim().toLowerCase();
  if (s === "home" || s === "h" || s === "home team") return "home";
  if (s === "away" || s === "a" || s === "away team") return "away";
  return null;
}

export function resolveSide(side, row) {
  const word = normalizeSideWord(side);
  if (word) return word;
  if (!row) return null;
  const s = normName(side);
  if (!s) return null;
  const home = normName(row.home);
  const away = normName(row.away);
  const homeHit = Boolean(home) && (s === home || home.includes(s) || s.includes(home));
  const awayHit = Boolean(away) && (s === away || away.includes(s) || s.includes(away));
  if (homeHit && !awayHit) return "home";
  if (awayHit && !homeHit) return "away";
  return null;
}

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
  if (out.side == null || String(out.side).trim() === "") return { error: "missing --side" };
  if (out.note == null || String(out.note).trim() === "") return { error: "missing --note" };
  out.side = String(out.side).trim();
  return out;
}

function loadJson(root, rel) {
  const p = join(root, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

export function issuePlay({ event, side, note, root = DEFAULT_ROOT, now = Date.now(), fpiAgeHours = 0 }) {
  if (!event) return { ok: false, error: "missing --event" };
  if (side == null || String(side).trim() === "") return { ok: false, error: "missing --side" };
  if (note == null || String(note).trim() === "") return { ok: false, error: "missing --note" };

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
  const resolved = resolveSide(side, row);
  if (!resolved) {
    return {
      ok: false,
      error: `--side must be home or away (got ${JSON.stringify(String(side))}). Team names also work.`,
    };
  }

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

  const sideTeam = resolved === "home" ? row.home : row.away;
  const issued = {
    ...row,
    issuedAt: new Date(now).toISOString(),
    approvedSide: resolved,
    sideTeam,
    sidePrice: row.marketHome ?? null,
    gateSnapshot: gate,
    issueNote: String(note).trim(),
    preIssue: { ...row },
    humanReview: "approved",
    dataClass: "ISSUED",
    result: "OPEN",
  };
  board.watch = board.watch.filter((r) => r.eventId !== event);
  if (Array.isArray(board.observe)) board.observe = board.observe.filter((r) => r.eventId !== event);
  board.issuedPlays = [...board.issuedPlays, issued];
  board.counts = { ...(board.counts || {}), issued: board.issuedPlays.length, watch: board.watch.length };

  ledger.open = Array.isArray(ledger.open) ? ledger.open : [];
  if (!ledger.open.some((r) => r.eventId === event)) {
    ledger.open.unshift({
      eventId: event,
      game_id: String(event),
      league: row.league,
      kick: row.kick,
      away: row.away,
      home: row.home,
      approvedSide: resolved,
      sideTeam,
      marketHome: row.marketHome ?? null,
      issuedAt: issued.issuedAt,
      issueNote: issued.issueNote,
      result: "OPEN",
      class: "ISSUED",
    });
  }
  if (ledger.regular?.ats) {
    ledger.target = {
      ats: 0.75,
      minN: 30,
      ...(ledger.target || {}),
      status:
        (ledger.regular.ats.n ?? 0) < 30
          ? `Not measurable. n=${ledger.regular.ats.n ?? 0} graded issued sides (need 30). ${ledger.open.length} open play${ledger.open.length === 1 ? "" : "s"}.`
          : ledger.target?.status,
    };
  }

  writeJsonAtomic(join(root, "src/data/board.json"), board, { root });
  writeJsonAtomic(join(root, "public/data/board.json"), board, { root });
  writeJsonAtomic(join(root, "src/data/ledger.json"), ledger, { root });
  writeJsonAtomic(join(root, "public/data/ledger.json"), ledger, { root });
  return { ok: true, issued, board, ledger };
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
      team: result.issued.sideTeam,
      matchup: `${result.issued.away} @ ${result.issued.home}`,
      issuedAt: result.issued.issuedAt,
    }),
  );
}
