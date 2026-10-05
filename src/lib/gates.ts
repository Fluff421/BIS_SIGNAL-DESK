/** Deterministic issuance gates. An LLM cannot promote a row to ISSUED. */

export type DataClass =
  | "DATA_ISSUE"
  | "STALE_FPI"
  | "HIGH_NOISE"
  | "WATCH"
  | "ALIGNED"
  | "LIBRARY"
  | "CANDIDATE"
  | "ISSUED"
  | "GRADED"
  | "RESEARCH";

export type GateStatus = "pass" | "fail" | "unknown";

export type HardGate = {
  id: string;
  label: string;
  status: GateStatus;
  reason: string;
};

export type CandidateInput = {
  observedAt?: string | null;
  nBooks?: number;
  fpiAgeHours?: number;
  teamMatchWarning?: boolean;
  unresolvedContext?: boolean;
  dataClass?: string;
  edge?: number;
  bandValidated?: boolean;
  storedLine?: boolean;
  humanReview?: string;
  gradedN?: number;
  kick?: string | null;
  lowLiquidity?: boolean;
};

/** Minimum distinct books. Matches refresh-universe / low-liquidity floor (nBooks < 3). */
export const GATES = {
  minBooks: 3,
  minEdge: 3,
  maxEdgeExclusive: 7,
  minGradedN: 30,
} as const;

export type GateResult = {
  gates: HardGate[];
  allHardGreen: boolean;
  quote75Allowed: boolean;
  class: DataClass;
  failures: string[];
};

function loose(a: string, b: string) {
  const na = String(a || "").toLowerCase();
  const nb = String(b || "").toLowerCase();
  return na === nb || (na.length > 2 && nb.length > 2 && (na.includes(nb) || nb.includes(na)));
}

export function unresolvedContextFor(
  row: { league?: string; home?: string; away?: string },
  injuries?: { nfl?: Array<{ team: string }>; ncaaf?: Array<{ team: string }> } | null,
): boolean {
  if (row.league !== "NFL") return true;
  const teams = [...(injuries?.nfl || []), ...(injuries?.ncaaf || [])];
  const hit = (name: string) => teams.some((t) => loose(t.team, name));
  return !(hit(String(row.home || "")) && hit(String(row.away || "")));
}

export function classifyEdge(edge: number, marketAbs: number): DataClass {
  const e = Math.abs(edge);
  if (e >= 15 || marketAbs >= 28) return "STALE_FPI";
  if (e >= 7) return "HIGH_NOISE";
  if (e >= 3) return "WATCH";
  return "ALIGNED";
}

export function kickMs(kick: string | null | undefined): number | null {
  if (!kick) return null;
  const iso = kick.length <= 10 ? `${kick}T23:59:59Z` : kick;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

export function buildCandidateInput(
  row: {
    observedAt?: string | null;
    nBooks?: number;
    teamMatchWarning?: boolean;
    dataClass?: string;
    edge?: number;
    marketHome?: number | null;
    humanReview?: string;
    kick?: string | null;
    lowLiquidity?: boolean;
  },
  ctx: { fpiAgeHours?: number; unresolvedContext?: boolean; gradedN?: number },
): CandidateInput {
  const edge = Number(row.edge);
  return {
    observedAt: row.observedAt,
    nBooks: row.nBooks,
    fpiAgeHours: ctx.fpiAgeHours,
    teamMatchWarning: row.teamMatchWarning,
    unresolvedContext: ctx.unresolvedContext,
    dataClass: row.dataClass,
    edge,
    bandValidated: Number.isFinite(edge) && Math.abs(edge) >= GATES.minEdge && Math.abs(edge) < GATES.maxEdgeExclusive,
    storedLine: row.marketHome != null && Boolean(row.observedAt),
    humanReview: row.humanReview ?? "none",
    gradedN: ctx.gradedN,
    kick: row.kick,
    lowLiquidity: row.lowLiquidity,
  };
}

function gate(id: string, label: string, status: GateStatus, reason: string): HardGate {
  return { id, label, status, reason };
}

export function evaluateCandidate(row: CandidateInput, now = Date.now()): GateResult {
  const stored = Boolean(row.storedLine);
  const storedGate = gate(
    "stored_line",
    "Stored market line",
    stored ? "pass" : "fail",
    stored ? "Observed line and timestamp are on file." : "Missing stored line.",
  );

  const edge = Math.abs(Number(row.edge));
  const bandOk =
    Boolean(row.bandValidated) && Number.isFinite(edge) && edge >= GATES.minEdge && edge < GATES.maxEdgeExclusive;
  const bandGate = gate(
    "edge_band",
    "3 to under 7 pt band",
    Number.isFinite(edge) ? (bandOk ? "pass" : "fail") : "unknown",
    bandOk
      ? `Edge ${edge.toFixed(1)} is inside the issuance band.`
      : `Edge must be ≥ ${GATES.minEdge} and < ${GATES.maxEdgeExclusive}.`,
  );

  const cls = String(row.dataClass || "");
  const classOk = cls === "WATCH";
  const classGate = gate(
    "data_class",
    "WATCH class only",
    cls ? (classOk ? "pass" : "fail") : "unknown",
    classOk ? "Row is in the WATCH issuance band." : `dataClass ${cls || "missing"} is suppressed.`,
  );

  const teamWarn = Boolean(row.teamMatchWarning);
  const teamGate = gate(
    "team_match",
    "Canonical team match",
    teamWarn ? "fail" : "pass",
    teamWarn ? "Fuzzy team-id warning is set." : "No team-match warning.",
  );

  const ctx = row.unresolvedContext;
  const ctxGate = gate(
    "context",
    "Context resolved",
    ctx == null ? "unknown" : ctx ? "fail" : "pass",
    ctx ? "Unresolved injury / QB / venue context." : ctx == null ? "Context flag not supplied." : "Context is resolved.",
  );

  const kick = kickMs(row.kick);
  const kickPassed = kick != null && kick <= now;
  const kickGate = gate(
    "kickoff",
    "Kickoff still ahead",
    kick == null ? "unknown" : kickPassed ? "fail" : "pass",
    kick == null ? "Kickoff timestamp missing." : kickPassed ? "Kickoff has already passed." : "Kickoff is still in the future.",
  );

  const books = row.nBooks;
  const lowLiq = Boolean(row.lowLiquidity);
  let bookStatus: GateStatus = "unknown";
  let bookReason = "Book count not on file.";
  if (lowLiq || (typeof books === "number" && books < GATES.minBooks)) {
    bookStatus = "fail";
    bookReason = `Need at least ${GATES.minBooks} books (low-liquidity floor). Have ${books ?? "n/a"}.`;
  } else if (typeof books === "number" && books >= GATES.minBooks) {
    bookStatus = "pass";
    bookReason = `${books} books meet the ${GATES.minBooks}-book floor.`;
  }
  const booksGate = gate("books", `${GATES.minBooks}+ sportsbooks`, bookStatus, bookReason);

  const gates = [storedGate, bandGate, classGate, teamGate, ctxGate, kickGate, booksGate];
  const allHardGreen = gates.every((g) => g.status === "pass");
  const quote75Allowed = (row.gradedN ?? 0) >= GATES.minGradedN;
  const failures = gates.filter((g) => g.status !== "pass").map((g) => g.id);

  return {
    gates,
    allHardGreen,
    quote75Allowed,
    class: (cls as DataClass) || "WATCH",
    failures,
  };
}

export function canIssue(row: CandidateInput, now = Date.now()): boolean {
  return evaluateCandidate(row, now).allHardGreen;
}

export function gradeSide(
  marketHome: number,
  actualMargin: number,
  edgeTo: string,
  home: string,
  away: string,
): { result: "WIN" | "LOSS" | "PUSH"; coverBy: number } {
  const homeCoverMargin = actualMargin + marketHome;
  let homeResult: "WIN" | "LOSS" | "PUSH" = "PUSH";
  if (homeCoverMargin > 0.05) homeResult = "WIN";
  else if (homeCoverMargin < -0.05) homeResult = "LOSS";
  if (edgeTo === home) return { result: homeResult, coverBy: Number(homeCoverMargin.toFixed(1)) };
  if (edgeTo === away) {
    if (homeResult === "PUSH") return { result: "PUSH", coverBy: 0 };
    return {
      result: homeResult === "WIN" ? "LOSS" : "WIN",
      coverBy: Number((-homeCoverMargin).toFixed(1)),
    };
  }
  return { result: homeResult, coverBy: Number(homeCoverMargin.toFixed(1)) };
}

export function duplicateKey(kick: string, home: string, away: string) {
  return `${kick}|${home.trim().toLowerCase()}|${away.trim().toLowerCase()}`;
}
