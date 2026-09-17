import snapshot from "@/data/snapshot.json";
import board from "@/data/board.json";
import ledger from "@/data/ledger.json";
import model from "@/data/model.json";
import digest from "@/data/digest.json";
import health from "@/data/api-health.json";
import teams from "@/data/teams.json";
import backtest from "@/data/backtests/fpi-hfa-2021-2025.json";
import calibration from "@/data/backtests/calibration-2021-2025.json";
import contextLayer from "@/data/context-layer.json";
import espnLive from "@/data/espn-live.json";
import injuries from "@/data/injuries.json";
import weather from "@/data/weather.json";
import travel from "@/data/travel.json";
import researchLedger from "@/data/research-ledger.json";
import teamIntel from "@/data/team-intel.json";
import publicBetting from "@/data/public-betting.json";
import history2024 from "@/data/history/ncaaf-games-2024.json";
import { evaluateCandidate, type CandidateInput, type GateResult } from "@/lib/gates";

export type PublicLean = {
  betsAway: number | null;
  betsHome: number | null;
  moneyAway: number | null;
  moneyHome: number | null;
  tickets: number | null;
  divergence: number | null;
  coversAway?: number | null;
  coversHome?: number | null;
  sbrAway?: number | null;
  sbrHome?: number | null;
  wtBetsAway?: number | null;
  wtBetsHome?: number | null;
  wtMoneyAway?: number | null;
  wtMoneyHome?: number | null;
  saoBetsAway?: number | null;
  saoBetsHome?: number | null;
  saoMoneyAway?: number | null;
  saoMoneyHome?: number | null;
  sbdBetsAway?: number | null;
  sbdBetsHome?: number | null;
  sbdMoneyAway?: number | null;
  sbdMoneyHome?: number | null;
  overBets?: number | null;
  overMoney?: number | null;
  moneySource?: string | null;
  moneyQuality?: string;
  ticketQuality?: string;
  source?: string;
};

export type WatchRow = {
  league: string;
  kick: string;
  away: string;
  home: string;
  neutral: boolean;
  marketHome: number;
  modelHome: number | null;
  edgeTo: string;
  edge: number;
  total: number | null;
  note: string;
  eventId?: string;
  observedAt?: string;
  confidence?: string;
  dataClass?: string;
  nBooks?: number;
  spreadStddev?: number | null;
  lineMovement?: number;
  bookmakers?: string[];
  lowLiquidity?: boolean;
  teamMatchWarning?: boolean;
  issuable?: boolean;
  humanReview?: string;
  canonicalHome?: string;
  canonicalAway?: string;
  completed?: boolean;
  status?: string;
  week?: number;
  tickets?: number | null;
  publicBetting?: PublicLean;
  homePoints?: number | null;
  awayPoints?: number | null;
  homeAbbr?: string;
  awayAbbr?: string;
  anId?: string;
};

export type AlignedRow = {
  league: string;
  away: string;
  home: string;
  marketHome: number;
  modelHome: number | null;
  total: number | null;
  note?: string;
};

export const deskSnapshot = snapshot;
export const deskBoard = board as {
  issuedPlays: unknown[];
  watch: WatchRow[];
  highNoise: WatchRow[];
  staleFpi: WatchRow[];
  observe: WatchRow[];
  library: WatchRow[];
  aligned: AlignedRow[];
  updated: string;
  source: string;
  counts: Record<string, number>;
};
export const deskLedger = ledger as typeof ledger & {
  regular: {
    ats: { hits: number; misses: number; pushes: number; n: number; rate: number | null };
    ml: { hits: number; misses: number; pushes: number; n: number; rate: number | null };
    totals: { hits: number; misses: number; pushes: number; n: number; rate: number | null };
  };
  graded: unknown[];
  target: { ats: number; minN: number; status: string };
  priorLogs: { place: string; found: string }[];
};
export const deskModel = model as typeof model & {
  version: string;
  engine: string;
  formula: string;
  watchThreshold: number;
  playThreshold: string;
  hfa: { ncaaf: number; nfl: number; neutral: number };
  ensembleSpec: { source: string; weights: Record<string, number>; fittedOn2026: boolean };
  changelog: { date: string; change: string }[];
  issuanceGates: Record<string, unknown>;
};
export const deskDigest = digest as typeof digest & {
  generatedAt: string;
  confidenceTier: string;
  helpers: string[];
  hurters: string[];
  summary: string;
  aiNarrative: string | null;
  narrativeStatus: string;
  narrativeFailureCode?: string | null;
  narrativeModel?: string;
  topGamesNextWeek: Array<{
    league: string;
    kick: string;
    matchup: string;
    edge: number;
    edgeTo: string;
    confidence: string;
    marketHome: number;
    modelHome: number;
    nBooks?: number;
  }>;
  atsRecord: { hits: number; misses: number; pushes: number; n: number; rate: number | null };
};
export const deskHealth = health as typeof health & {
  actionnetwork?: { status: string; reason?: string; nflEvents?: number; ncaafEvents?: number };
  covers?: { status: string; reason?: string; rows?: number };
  sbr?: { status: string; reason?: string; rows?: number };
  wagertalk?: { status: string; reason?: string; rows?: number; nfl?: number; ncaaf?: number };
  scoresandodds?: { status: string; reason?: string; rows?: number; nfl?: number; ncaaf?: number; matched?: number; money?: number };
  sportsbettingdime?: { status: string; reason?: string; rows?: number; nfl?: number; ncaaf?: number; matched?: number; money?: number };
};
export const deskTeams = teams as { teams: Array<{ canonicalId: string; displayName: string; league: string; conference: string | null }> };
export const deskBacktest = backtest;
export const deskCalibration = calibration;
export const deskContext = contextLayer;
export const deskHistorySample = (history2024 as { rows: Array<Record<string, unknown>> }).rows.slice(0, 8);
export const deskPublicBetting = publicBetting as {
  generatedAt: string;
  source: string;
  methodology: string;
  quality: string;
  coverage: Record<string, number>;
  rows: PublicLean[];
};

export const DESK_NOW = Date.parse(deskBoard.updated);
export const FPI_AGE_HOURS = Math.max(
  0,
  (DESK_NOW - Date.parse(deskSnapshot.asOf)) / 3_600_000,
);

export function fmtSpread(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  if (n === 0) return "PK";
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1);
}

export function fmtKick(iso: string) {
  const d = iso.length <= 10 ? iso : iso.slice(0, 10);
  return d;
}

export function fmtKickLong(iso: string) {
  const d = iso.length <= 10 ? `${iso}T16:00:00Z` : iso;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

export function teamAbbr(name: string) {
  const special: Record<string, string> = {
    "Las Vegas Raiders": "LV",
    "Kansas City Chiefs": "KC",
    "Los Angeles Chargers": "LAC",
    "Los Angeles Rams": "LAR",
    "New York Giants": "NYG",
    "New York Jets": "NYJ",
    "Tampa Bay Buccaneers": "TB",
    "Green Bay Packers": "GB",
    "New England Patriots": "NE",
    "San Francisco 49ers": "SF",
    "Miami Dolphins": "MIA",
    "Miami Hurricanes": "MIA",
    "Ohio State": "OSU",
    "Notre Dame": "ND",
    "NC State": "NCSU",
  };
  if (special[name]) return special[name];
  const parts = name.replace(/[().]/g, "").split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  const skip = new Set(["of", "the", "and", "at", "st", "state"]);
  const letters = parts.filter((p) => !skip.has(p.toLowerCase())).map((p) => p[0]);
  return letters.slice(0, 3).join("").toUpperCase();
}

export function gateForRow(row: WatchRow): GateResult {
  const input: CandidateInput = {
    observedAt: row.observedAt,
    nBooks: row.nBooks,
    fpiAgeHours: FPI_AGE_HOURS,
    teamMatchWarning: row.teamMatchWarning,
    unresolvedContext: contextUnresolved(row),
    dataClass: row.dataClass,
    edge: row.edge,
    bandValidated: Math.abs(row.edge) >= 3 && Math.abs(row.edge) < 7,
    storedLine: row.marketHome != null && Boolean(row.observedAt),
    humanReview: row.humanReview ?? "none",
    gradedN: deskLedger.regular.ats.n,
  };
  return evaluateCandidate(input, DESK_NOW);
}

export function prettyTeamId(id: string) {
  return id.replace(/^(ncaaf|nfl)-/, "").replace(/-/g, " ");
}

function looseName(a: string, b: string) {
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  return na === nb || na.includes(nb) || nb.includes(na);
}

export const deskInjuries = injuries as {
  generatedAt: string;
  nfl: InjuryTeam[];
  ncaaf: InjuryTeam[];
};
export const deskWeather = weather as { generatedAt: string; byHome: Record<string, WeatherStamp> };
export const deskTravel = travel as { generatedAt: string; rows: TravelRow[] };
export const deskResearch = researchLedger as {
  generatedAt: string;
  policy: string;
  pathTo30: {
    researchN: number;
    issuedN: number;
    remainingResearch: number;
    watchOnBoard: number;
    observeOnBoard?: number;
    libraryOnBoard?: number;
    teamsCovered?: number;
    note: string;
  };
  ats: { hits: number; misses: number; pushes: number; n: number; rate: number | null };
  cleanBand?: { hits: number; misses: number; pushes: number; n: number; rate: number | null; note: string };
  rows: Array<{
    league: string;
    kick: string;
    away: string;
    home: string;
    side: string;
    result: string;
    dataClass?: string;
    marketHome?: number;
    class?: string;
  }>;
};
export const deskTeamIntel = teamIntel as {
  generatedAt: string;
  policy: string;
  teamCount: number;
  withGrades: number;
  teams: TeamIntelRow[];
};

export type TeamIntelRow = {
  team: string;
  league: string;
  n: number;
  hits: number;
  misses: number;
  pushes: number;
  rate: number | null;
  lastResult: string | null;
  lastKick: string | null;
  games: number;
  upcoming: number;
};

export type InjuryPlayer = { name: string; pos: string; status: string; date: string };
export type InjuryTeam = { league: string; team: string; qb: InjuryPlayer[]; notable: InjuryPlayer[]; reportCount: number };
export type WeatherStamp = {
  stadium?: string;
  tz?: string;
  temp?: number;
  unit?: string;
  wind?: string;
  forecast?: string;
  precip?: number | null;
  source?: string;
  quality?: string;
  error?: string;
};
export type TravelRow = {
  home: string;
  away: string;
  travelMilesAway: number | null;
  tzDeltaHours: number | null;
  restNote: string;
  quality: string;
};

export function injuryFor(team: string): InjuryTeam | null {
  const all = [...deskInjuries.nfl, ...deskInjuries.ncaaf];
  return all.find((t) => looseName(t.team, team)) ?? null;
}

export function qbHeadline(team: string): string {
  const inj = injuryFor(team);
  if (!inj) return "No ESPN injury snapshot for this club.";
  if (!inj.qb.length) return `Injury report in (${inj.reportCount} names) — no QB listed.`;
  const rank = ["Out", "Doubtful", "Questionable", "Active"];
  const sorted = [...inj.qb].sort((a, b) => rank.indexOf(a.status) - rank.indexOf(b.status));
  return sorted
    .slice(0, 3)
    .map((q) => `${q.name} ${q.status}`)
    .join(" · ");
}

export function weatherFor(home: string): WeatherStamp | null {
  return deskWeather.byHome[home] ?? null;
}

export function travelFor(home: string, away: string): TravelRow | null {
  return deskTravel.rows.find((r) => r.home === home && r.away === away) ?? null;
}

export function contextUnresolved(row: WatchRow): boolean {
  if (row.league === "NFL") {
    const homeInj = injuryFor(row.home);
    const awayInj = injuryFor(row.away);
    return !(homeInj && awayInj);
  }
  return true;
}

export const deskEspn = espnLive as {
  generatedAt: string;
  nfl: { week: number | null; rows: EspnGame[] };
  ncaaf: { week: number | null; rows: EspnGame[] };
};

export type EspnGame = {
  league: string;
  id: string;
  kick: string;
  week: number | null;
  name: string;
  completed: boolean;
  status: string;
  home: string;
  away: string;
  homePoints: number | null;
  awayPoints: number | null;
  actualMargin: number | null;
  venue: string | null;
  weather: { display: string | null; temp: number | null; quality: string } | null;
};

export function espnForMatchup(home: string, away: string): EspnGame | null {
  const pool = [...deskEspn.nfl.rows, ...deskEspn.ncaaf.rows];
  return (
    pool.find((g) => g.home === home && g.away === away) ||
    pool.find((g) => looseName(g.home, home) && looseName(g.away, away)) ||
    null
  );
}

export function teamIntelFor(name: string): TeamIntelRow | null {
  return deskTeamIntel.teams.find((t) => looseName(t.team, name)) ?? null;
}

export function publicLeanLine(p?: PublicLean | null): string {
  if (!p) return "Public lean not on file.";
  const tickets = p.betsAway != null ? `bets ${p.betsAway}/${p.betsHome}` : "bets —";
  const money = p.moneyAway != null ? `money ${p.moneyAway}/${p.moneyHome}` : "money —";
  const vol = p.tickets != null ? `${p.tickets.toLocaleString()} tickets` : "volume —";
  const div = p.divergence != null ? `div ${p.divergence > 0 ? "+" : ""}${p.divergence}` : null;
  const via = p.moneySource ? p.moneySource : null;
  return [tickets, money, vol, div, via].filter(Boolean).join(" · ");
}

export function divergenceRows(rows: WatchRow[], min = 10): WatchRow[] {
  return [...rows]
    .filter((r) => r.publicBetting?.divergence != null && Math.abs(r.publicBetting.divergence) >= min)
    .sort(
      (a, b) =>
        Math.abs(b.publicBetting?.divergence ?? 0) - Math.abs(a.publicBetting?.divergence ?? 0),
    );
}
