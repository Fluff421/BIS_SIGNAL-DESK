#!/usr/bin/env node
/**
 * Expand the research universe across NFL + NCAAF (posted weeks) and overlay
 * public-lean signals from:
 *   - SportsBettingDime (ticket % AND money/handle % on the live slate — primary)
 *   - ScoresAndOdds consensus (ticket % AND money/handle %)
 *   - WagerTalk (ticket % AND money/handle — Sunday tape)
 *   - Action Network (ticket volume + featured money %)
 *   - Sportsbook Review (spread pick %)
 *   - Covers contests (pick %)
 * ESPN CDN scoreboard overlays finals so week-of results grade without waiting on AN.
 *
 * Grades completed games vs stored consensus as RESEARCH (not issued).
 * Merges prior library rows so the club database only grows.
 * Never logs secrets. Never promotes a row to ISSUED.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const HFA = { NFL: 2.0, NCAAF: 2.5 };
const NFL_WEEKS = [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const NCAAF_WEEKS = [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const SBD_BOOKS = "sr:book:7612,sr:book:31520,sr:book:28901,sr:book:32784";
const ABBR_ALIAS = {
  JAC: "JAX",
  JAX: "JAX",
  WSH: "WAS",
  WAS: "WAS",
  LA: "LAR",
  LAR: "LAR",
  GONZ: "GON",
  PITT: "PIT",
  PIT: "PIT",
};

function atomicWrite(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  const staged = join(dirname(path), `.${randomBytes(6).toString("hex")}.tmp`);
  writeFileSync(staged, JSON.stringify(obj, null, 2) + "\n");
  renameSync(staged, path);
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

async function fetchJson(url, referer) {
  const headers = {
    "User-Agent": UA,
    Accept: "application/json",
    Referer: referer || "https://www.actionnetwork.com/",
  };
  if (referer && !/espn\.com/i.test(referer)) {
    headers.Origin = new URL(referer).origin;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fetchText(url, referer) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/json",
      Referer: referer || url,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

function lastToken(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[().']/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-1)[0];
}

function norm(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[().']/g, "")
    .replace(/\bst\b/g, "state")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = lastToken(na);
  const tb = lastToken(nb);
  return ta === tb && ta.length > 2;
}

function fpiLookup(list, name) {
  return (
    list.find((t) => namesMatch(t.team, name)) ||
    list.find((t) => lastToken(t.team) === lastToken(name) && lastToken(name).length > 2) ||
    null
  );
}

function classify(edge, marketAbs, hasModel) {
  if (!hasModel) return "LIBRARY";
  const e = Math.abs(edge);
  if (e >= 15 || marketAbs >= 28) return "STALE_FPI";
  if (e >= 7) return "HIGH_NOISE";
  if (e >= 3) return "WATCH";
  return "ALIGNED";
}

function gameOdds(g) {
  const rows = (g.odds || []).filter((o) => o.type === "game" && o.spread_home != null);
  const consensus = rows.find((o) => o.book_id === 15) || rows[0] || null;
  const books = [...new Set(rows.map((o) => o.book_id).filter(Boolean))];
  return { consensus, books, nBooks: books.length };
}

function parseGame(g, league) {
  const teams = Object.fromEntries((g.teams || []).map((t) => [t.id, t]));
  const home = teams[g.home_team_id];
  const away = teams[g.away_team_id];
  if (!home || !away) return null;
  const { consensus, books, nBooks } = gameOdds(g);
  const box = g.boxscore || {};
  const completed = g.status === "complete" || Boolean(g.winning_team_id);
  const homePts = box.total_home_points;
  const awayPts = box.total_away_points;
  const latest = box.latest_odds?.game;
  const spreadHome = consensus?.spread_home ?? latest?.spread_home ?? null;
  const total = consensus?.total ?? latest?.total ?? null;
  const pub = consensus
    ? {
        betsHome: consensus.spread_home_public ?? null,
        betsAway: consensus.spread_away_public ?? null,
        moneyHome: consensus.spread_home_money ?? null,
        moneyAway: consensus.spread_away_money ?? null,
      }
    : {};
  return {
    league,
    anId: String(g.id),
    week: g.week,
    kick: g.start_time,
    status: completed ? "complete" : g.status || "scheduled",
    completed,
    home: home.full_name,
    away: away.full_name,
    homeAbbr: home.abbr,
    awayAbbr: away.abbr,
    marketHome: spreadHome,
    total,
    nBooks,
    bookmakers: books.slice(0, 8).map(String),
    tickets: g.num_bets ?? null,
    homePoints: Number.isFinite(homePts) ? homePts : null,
    awayPoints: Number.isFinite(awayPts) ? awayPts : null,
    actualMargin:
      completed && Number.isFinite(homePts) && Number.isFinite(awayPts) ? homePts - awayPts : null,
    apiPublic: pub,
  };
}

function matchSeed(seedRows, away, home) {
  return (
    seedRows.find((r) => namesMatch(r.away, away) && namesMatch(r.home, home)) ||
    seedRows.find((r) => lastToken(r.away) === lastToken(away) && lastToken(r.home) === lastToken(home)) ||
    null
  );
}

function parsePctPair(cell) {
  const m = String(cell || "").match(/(\d{1,3})\s*%\s*\|\s*(\d{1,3})\s*%/);
  if (!m) return [null, null];
  return [Number(m[1]), Number(m[2])];
}

function parseCoversTable(html, league) {
  const table = html.match(/<table[\s\S]*?<\/table>/i);
  if (!table) return [];
  const rows = [];
  const trs = table[0].match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trs.slice(1)) {
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      m[1]
        .replace(/<br\s*\/?>/gi, " | ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    if (cells.length < 5) continue;
    const matchup = cells[0].replace(/^(NFL|NCAAF)\s+/i, "").trim();
    const parts = matchup.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;
    const [betsAway, betsHome] = parsePctPair(cells[2]);
    const picks = String(cells[4]).split("|").map((s) => Number(s.replace(/[^\d]/g, "")) || null);
    rows.push({
      league,
      awayAbbr: parts[0],
      homeAbbr: parts[1],
      betsAway,
      betsHome,
      picksAway: picks[0] ?? null,
      picksHome: picks[1] ?? null,
      source: "covers-contest-picks",
    });
  }
  return rows;
}

function parseSbr(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return [];
  let data;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return [];
  }
  const tables = data?.props?.pageProps?.oddsTables || [];
  const rows = [];
  for (const t of tables) {
    for (const g of t?.oddsTableModel?.gameRows || []) {
      const gv = g.gameView || {};
      const c = gv.consensus || {};
      const away = gv.awayTeam?.fullName;
      const home = gv.homeTeam?.fullName;
      const betsAway = Number.isFinite(c.awaySpreadPickPercent)
        ? Math.round(c.awaySpreadPickPercent)
        : null;
      const betsHome = Number.isFinite(c.homeSpreadPickPercent)
        ? Math.round(c.homeSpreadPickPercent)
        : null;
      if (!away || !home) continue;
      rows.push({
        league: gv.leagueName === "NFL" ? "NFL" : "NCAAF",
        away,
        home,
        betsAway,
        betsHome,
        source: "sbr-consensus-picks",
      });
    }
  }
  return rows;
}

function stripTags(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseWtPctCell(html) {
  const parts = [...String(html || "").matchAll(/([ou])?(\d{1,3})\s*%/gi)];
  let away = null;
  let home = null;
  let over = null;
  for (const p of parts) {
    const flag = (p[1] || "").toLowerCase();
    const n = Number(p[2]);
    if (flag === "o") over = n;
    else if (flag === "u") over = 100 - n;
    else if (away == null) away = n;
    else home = n;
  }
  if (away != null && home == null) home = Math.max(0, 100 - away);
  return { away, home, over };
}

function leagueFromHeader(text) {
  const t = String(text || "").toUpperCase();
  if (t.includes("NFL")) return "NFL";
  if (t.includes("COLLEGE FOOTBALL") || t.includes("NCAAF") || t.includes("NCAA FOOTBALL")) return "NCAAF";
  if (t.includes("MAJOR LEAGUE") || t.includes("NBA") || t.includes("NHL") || t.includes("TENNIS") || t.includes("WNBA"))
    return null;
  return undefined;
}

function parseWagerTalk(html) {
  const table = html.match(/<table id="schedule"[\s\S]*?<\/table>/i);
  if (!table) return [];
  const rows = [];
  let league = null;
  const trs = table[0].match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trs) {
    const text = stripTags(tr);
    const headerLeague = leagueFromHeader(text);
    if (headerLeague !== undefined && /head1|colspan|WEEK|FOOTBALL|BASEBALL|WNBA/i.test(tr + text)) {
      league = headerLeague;
      continue;
    }
    if (!league) continue;
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1]);
    if (cells.length < 7) continue;
    const teamDivs = [...String(cells[2] || "").matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi)].map((m) =>
      stripTags(m[1]),
    );
    if (teamDivs.length < 2) continue;
    const awayAbbr = teamDivs[0].split(/\s+/)[0];
    const homeAbbr = teamDivs[1].split(/\s+/)[0];
    if (!awayAbbr || !homeAbbr || awayAbbr.length > 6) continue;
    const tickets = parseWtPctCell(cells[5]);
    const money = parseWtPctCell(cells[6]);
    if (tickets.away == null && money.away == null) continue;
    rows.push({
      league,
      awayAbbr: awayAbbr.toUpperCase(),
      homeAbbr: homeAbbr.toUpperCase(),
      away: awayAbbr,
      home: homeAbbr,
      betsAway: tickets.away,
      betsHome: tickets.home,
      moneyAway: money.away,
      moneyHome: money.home,
      overTickets: tickets.over,
      overMoney: money.over,
      source: "wagertalk-consensus",
    });
  }
  return rows;
}

function pctFrom(text, width) {
  const m = String(text || "").match(/(\d{1,3})/);
  if (m) return Number(m[1]);
  if (Number.isFinite(width)) return width;
  return null;
}

function fillPair(away, home) {
  if (away != null && (home == null || home === 0) && away > 0 && away < 100) home = 100 - away;
  if (home != null && (away == null || away === 0) && home > 0 && home < 100) away = 100 - home;
  if (away === 0 && home === 0) return [null, null];
  return [away ?? null, home ?? null];
}

function parseSao(html, league) {
  const cards =
    html.match(
      /<div class="trend-card consensus consensus-table-spread--0[^"]*"[\s\S]*?<\/ul>\s*<\/div>\s*<\/div>/g,
    ) || [];
  const rows = [];
  for (const card of cards) {
    const names = [...card.matchAll(/<span class="team-name">\s*<span>([^<]+)<\/span>/g)].map((m) =>
      m[1].trim(),
    );
    if (names.length < 2) continue;
    const logos = [...card.matchAll(/teamlogos\/(?:nfl|ncaaf)\/100\/([a-z0-9]+)\.png/gi)].map((m) =>
      m[1].toUpperCase(),
    );
    const flags = [...card.matchAll(/team-flag"\s+([A-Z0-9]{2,4})""/g)].map((m) => m[1]);
    const kick = (card.match(/data-value="([^"]+)"/) || [])[1] || null;
    const widthsA = [...card.matchAll(/class="percentage-a" style="width:(\d+)%/g)].map((m) => Number(m[1]));
    const widthsB = [...card.matchAll(/class="percentage-b" style="width:(\d+)%/g)].map((m) => Number(m[1]));
    const txtA = [...card.matchAll(/class="percentage-a"[^>]*>([^<]*)</g)].map((m) => m[1]);
    const txtB = [...card.matchAll(/class="percentage-b"[^>]*>([^<]*)</g)].map((m) => m[1]);
    const [betsAway, betsHome] = fillPair(pctFrom(txtA[0], widthsA[0]), pctFrom(txtB[0], widthsB[0]));
    const [moneyAway, moneyHome] = fillPair(pctFrom(txtA[1], widthsA[1]), pctFrom(txtB[1], widthsB[1]));
    if (betsAway == null && moneyAway == null) continue;
    rows.push({
      league,
      away: names[0],
      home: names[1],
      awayAbbr: flags[0] || logos[0] || null,
      homeAbbr: flags[1] || logos[1] || null,
      kick,
      betsAway,
      betsHome,
      moneyAway,
      moneyHome,
      source: "scoresandodds-consensus",
    });
  }
  return rows;
}

function roundPct(n) {
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sbdFullName(comp) {
  if (!comp) return "";
  const market = String(comp.market || "").trim();
  const name = String(comp.name || "").trim();
  if (market && name && !market.toLowerCase().includes(name.toLowerCase())) return `${market} ${name}`;
  return name || market;
}

function parseSbd(data, league) {
  const rows = [];
  for (const ev of data?.data || []) {
    const away = ev.competitors?.away;
    const home = ev.competitors?.home;
    if (!away || !home) continue;
    const spread = ev.bettingSplits?.spread || {};
    const total = ev.bettingSplits?.total || {};
    const betsAway = roundPct(spread.away?.betsPercentage);
    const betsHome = roundPct(spread.home?.betsPercentage);
    const moneyAway = roundPct(spread.away?.stakePercentage);
    const moneyHome = roundPct(spread.home?.stakePercentage);
    if (betsAway == null && moneyAway == null) continue;
    rows.push({
      league,
      away: sbdFullName(away),
      home: sbdFullName(home),
      awayAbbr: away.abbreviation || away.alias || null,
      homeAbbr: home.abbreviation || home.alias || null,
      kick: ev.scheduled || null,
      betsAway,
      betsHome,
      moneyAway,
      moneyHome,
      overBets: roundPct(total.over?.betsPercentage),
      overMoney: roundPct(total.over?.stakePercentage),
      source: "sportsbettingdime",
    });
  }
  return rows;
}

function canonAbbr(a) {
  const k = String(a || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return ABBR_ALIAS[k] || k;
}

async function loadAnLeague(path, league, weeks) {
  const packs = await Promise.allSettled(
    weeks.map((w) => fetchJson(`${path}${w != null ? `?week=${w}` : ""}`)),
  );
  const seen = new Set();
  const rows = [];
  for (const pack of packs) {
    if (pack.status !== "fulfilled") continue;
    for (const g of pack.value.games || []) {
      const parsed = parseGame(g, league);
      if (!parsed || seen.has(parsed.anId)) continue;
      seen.add(parsed.anId);
      rows.push(parsed);
    }
  }
  return rows;
}

async function loadEspn(path, league) {
  const url = `https://cdn.espn.com/core/${path}/scoreboard?xhr=1`;
  const data = await fetchJson(url, "https://www.espn.com/");
  const sb = data?.content?.sbData || {};
  const rows = [];
  for (const ev of sb.events || []) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const home = (comp.competitors || []).find((c) => c.homeAway === "home");
    const away = (comp.competitors || []).find((c) => c.homeAway === "away");
    if (!home || !away) continue;
    const homePts = home.score === "" || home.score == null ? null : Number(home.score);
    const awayPts = away.score === "" || away.score == null ? null : Number(away.score);
    const completed = Boolean(ev.status?.type?.completed);
    rows.push({
      league,
      home: home.team?.displayName ?? home.team?.name,
      away: away.team?.displayName ?? away.team?.name,
      completed,
      homePoints: Number.isFinite(homePts) ? homePts : null,
      awayPoints: Number.isFinite(awayPts) ? awayPts : null,
      actualMargin:
        completed && Number.isFinite(homePts) && Number.isFinite(awayPts) ? homePts - awayPts : null,
    });
  }
  return rows;
}

function overlayEspn(games, espnRows) {
  let n = 0;
  for (const g of games) {
    if (g.completed && g.actualMargin != null) continue;
    const hit =
      espnRows.find((e) => e.league === g.league && namesMatch(e.home, g.home) && namesMatch(e.away, g.away)) ||
      espnRows.find(
        (e) =>
          e.league === g.league &&
          lastToken(e.home) === lastToken(g.home) &&
          lastToken(e.away) === lastToken(g.away) &&
          lastToken(g.home).length > 2,
      );
    if (!hit?.completed || hit.actualMargin == null) continue;
    g.completed = true;
    g.status = "complete";
    g.homePoints = hit.homePoints;
    g.awayPoints = hit.awayPoints;
    g.actualMargin = hit.actualMargin;
    g.espnOverlay = true;
    n += 1;
  }
  return n;
}

async function loadSbd(path, league) {
  const url = `https://www.sportsbettingdime.com/wp-json/adpt/v1/${path}-odds?books=${SBD_BOOKS}&format=us`;
  const data = await fetchJson(url, "https://www.sportsbettingdime.com/");
  return parseSbd(data, league);
}

function matchWt(wtRows, row) {
  const a = canonAbbr(row.awayAbbr);
  const h = canonAbbr(row.homeAbbr);
  return (
    wtRows.find(
      (r) =>
        r.league === row.league &&
        canonAbbr(r.awayAbbr) === a &&
        canonAbbr(r.homeAbbr) === h,
    ) ||
    wtRows.find((r) => namesMatch(r.away, row.away) && namesMatch(r.home, row.home)) ||
    null
  );
}

function matchSao(saoRows, row) {
  const a = canonAbbr(row.awayAbbr);
  const h = canonAbbr(row.homeAbbr);
  return (
    saoRows.find(
      (r) =>
        r.league === row.league &&
        a &&
        h &&
        canonAbbr(r.awayAbbr) === a &&
        canonAbbr(r.homeAbbr) === h,
    ) ||
    saoRows.find((r) => namesMatch(r.away, row.away) && namesMatch(r.home, row.home)) ||
    saoRows.find(
      (r) =>
        lastToken(r.away) === lastToken(row.away) &&
        lastToken(r.home) === lastToken(row.home) &&
        lastToken(row.away).length > 2,
    ) ||
    saoRows.find(
      (r) =>
        r.kick &&
        row.kick &&
        String(r.kick).slice(0, 10) === String(row.kick).slice(0, 10) &&
        (namesMatch(r.home, row.home) || lastToken(r.home) === lastToken(row.home)),
    ) ||
    null
  );
}

function matchSbd(sbdRows, row) {
  const a = canonAbbr(row.awayAbbr);
  const h = canonAbbr(row.homeAbbr);
  return (
    sbdRows.find(
      (r) =>
        r.league === row.league &&
        a &&
        h &&
        canonAbbr(r.awayAbbr) === a &&
        canonAbbr(r.homeAbbr) === h,
    ) ||
    sbdRows.find((r) => namesMatch(r.away, row.away) && namesMatch(r.home, row.home)) ||
    sbdRows.find(
      (r) =>
        lastToken(r.away) === lastToken(row.away) &&
        lastToken(r.home) === lastToken(row.home) &&
        lastToken(row.away).length > 2,
    ) ||
    null
  );
}

function attachPublic(row, seedRows, coversRows, sbrRows, wtRows, saoRows, sbdRows, abbrIndex, priorPub) {
  const seed = matchSeed(seedRows, row.away, row.home);
  const sbr =
    sbrRows.find((r) => namesMatch(r.away, row.away) && namesMatch(r.home, row.home)) ||
    sbrRows.find((r) => lastToken(r.away) === lastToken(row.away) && lastToken(r.home) === lastToken(row.home)) ||
    null;
  const covers =
    coversRows.find((r) => {
      const a = abbrIndex.get(`${row.league}:${String(r.awayAbbr).toLowerCase()}`);
      const h = abbrIndex.get(`${row.league}:${String(r.homeAbbr).toLowerCase()}`);
      if (a && h) return namesMatch(a, row.away) && namesMatch(h, row.home);
      return (
        String(r.awayAbbr).toLowerCase() === String(row.awayAbbr || "").toLowerCase() &&
        String(r.homeAbbr).toLowerCase() === String(row.homeAbbr || "").toLowerCase()
      );
    }) || null;
  const wt = matchWt(wtRows, row);
  const sao = matchSao(saoRows, row);
  const sbd = matchSbd(sbdRows, row);

  const betsAway =
    sbd?.betsAway ??
    row.apiPublic?.betsAway ??
    seed?.betsAway ??
    sao?.betsAway ??
    wt?.betsAway ??
    sbr?.betsAway ??
    covers?.betsAway ??
    priorPub?.betsAway ??
    null;
  const betsHome =
    sbd?.betsHome ??
    row.apiPublic?.betsHome ??
    seed?.betsHome ??
    sao?.betsHome ??
    wt?.betsHome ??
    sbr?.betsHome ??
    covers?.betsHome ??
    priorPub?.betsHome ??
    null;
  const moneyAway =
    sbd?.moneyAway ??
    sao?.moneyAway ??
    wt?.moneyAway ??
    row.apiPublic?.moneyAway ??
    seed?.moneyAway ??
    priorPub?.moneyAway ??
    null;
  const moneyHome =
    sbd?.moneyHome ??
    sao?.moneyHome ??
    wt?.moneyHome ??
    row.apiPublic?.moneyHome ??
    seed?.moneyHome ??
    priorPub?.moneyHome ??
    null;
  const tickets = seed?.tickets ?? row.tickets ?? priorPub?.tickets ?? null;
  let divergence = null;
  if (moneyAway != null && betsAway != null) divergence = moneyAway - betsAway;

  const ticketFromAn = row.apiPublic?.betsAway != null || seed?.betsAway != null;
  const sources = [];
  if (sbd) sources.push("sportsbettingdime");
  if (ticketFromAn || tickets) sources.push("actionnetwork");
  if (sao) sources.push("scoresandodds");
  if (wt) sources.push("wagertalk");
  if (sbr?.betsAway != null) sources.push("sbr");
  if (covers?.betsAway != null) sources.push("covers");

  const moneySource =
    sbd?.moneyAway != null
      ? "sportsbettingdime"
      : sao?.moneyAway != null
        ? "scoresandodds"
        : wt?.moneyAway != null
          ? "wagertalk"
          : row.apiPublic?.moneyAway != null || seed?.moneyAway != null
            ? "actionnetwork"
            : priorPub?.moneyAway != null
              ? priorPub.moneySource || "persisted"
              : null;

  return {
    betsAway,
    betsHome,
    moneyAway,
    moneyHome,
    tickets,
    divergence,
    coversAway: covers?.betsAway ?? priorPub?.coversAway ?? null,
    coversHome: covers?.betsHome ?? priorPub?.coversHome ?? null,
    sbrAway: sbr?.betsAway ?? priorPub?.sbrAway ?? null,
    sbrHome: sbr?.betsHome ?? priorPub?.sbrHome ?? null,
    wtBetsAway: wt?.betsAway ?? priorPub?.wtBetsAway ?? null,
    wtBetsHome: wt?.betsHome ?? priorPub?.wtBetsHome ?? null,
    wtMoneyAway: wt?.moneyAway ?? priorPub?.wtMoneyAway ?? null,
    wtMoneyHome: wt?.moneyHome ?? priorPub?.wtMoneyHome ?? null,
    saoBetsAway: sao?.betsAway ?? priorPub?.saoBetsAway ?? null,
    saoBetsHome: sao?.betsHome ?? priorPub?.saoBetsHome ?? null,
    saoMoneyAway: sao?.moneyAway ?? priorPub?.saoMoneyAway ?? null,
    saoMoneyHome: sao?.moneyHome ?? priorPub?.saoMoneyHome ?? null,
    sbdBetsAway: sbd?.betsAway ?? priorPub?.sbdBetsAway ?? null,
    sbdBetsHome: sbd?.betsHome ?? priorPub?.sbdBetsHome ?? null,
    sbdMoneyAway: sbd?.moneyAway ?? priorPub?.sbdMoneyAway ?? null,
    sbdMoneyHome: sbd?.moneyHome ?? priorPub?.sbdMoneyHome ?? null,
    overBets: sbd?.overBets ?? priorPub?.overBets ?? null,
    overMoney: sbd?.overMoney ?? priorPub?.overMoney ?? null,
    moneySource,
    moneyQuality: moneyAway != null ? "provisional" : "missing",
    ticketQuality: sbd?.betsAway != null
      ? "provisional"
      : ticketFromAn
        ? "provisional"
        : sao?.betsAway != null || wt?.betsAway != null
          ? "provisional"
          : betsAway != null
            ? "proxy"
            : tickets != null
              ? "volume-only"
              : "missing",
    source: sources.length ? sources.join("+") : "none",
  };
}

function buildRow(g, fpiHome, fpiAway, existing, publicBet) {
  const hasModel = fpiHome != null && fpiAway != null && g.marketHome != null;
  const modelHome = hasModel ? Number((fpiHome - fpiAway + HFA[g.league]).toFixed(1)) : null;
  const edge = hasModel ? Number((modelHome - g.marketHome).toFixed(1)) : null;
  const dataClass = classify(edge ?? 0, Math.abs(g.marketHome ?? 0), hasModel);
  const edgeTo = edge == null ? g.home : edge >= 0 ? g.home : g.away;
  const prior = existing || {};
  return {
    league: g.league,
    kick: g.kick,
    away: g.away,
    home: g.home,
    homeAbbr: g.homeAbbr,
    awayAbbr: g.awayAbbr,
    neutral: false,
    marketHome: g.marketHome,
    modelHome,
    edgeTo,
    edge: edge != null ? Math.abs(edge) : 0,
    total: g.total ?? prior.total ?? null,
    note: hasModel
      ? "Action Network consensus + FPI+HFA. Full-slate research universe — not issued."
      : "Library row (no FPI match). Stored line only. Not issued.",
    eventId: prior.eventId ?? `an-${g.anId}`,
    anId: g.anId,
    observedAt: new Date().toISOString(),
    confidence: dataClass,
    dataClass,
    nBooks: Math.max(g.nBooks || 0, prior.nBooks || 0),
    spreadStddev: prior.spreadStddev ?? null,
    lineMovement: prior.lineMovement ?? 0,
    bookmakers: prior.bookmakers?.length ? prior.bookmakers : g.bookmakers,
    teamMatchWarning: !hasModel,
    humanReview: "none",
    issuable: false,
    status: g.status,
    completed: g.completed,
    homePoints: g.homePoints,
    awayPoints: g.awayPoints,
    week: g.week,
    publicBetting: publicBet,
    tickets: publicBet.tickets,
  };
}

function gradeRow(row) {
  const actual =
    row.actualMargin != null
      ? row.actualMargin
      : Number.isFinite(row.homePoints) && Number.isFinite(row.awayPoints)
        ? row.homePoints - row.awayPoints
        : null;
  if (!row.completed || actual == null || row.marketHome == null) return null;
  const homeCover = actual + Number(row.marketHome);
  const hasLean = row.dataClass === "WATCH" || row.dataClass === "HIGH_NOISE" || row.dataClass === "ALIGNED";
  const side = hasLean ? row.edgeTo : Number(row.marketHome) < 0 ? row.home : row.away;
  const sideIsHome = side === row.home;
  const marginForSide = sideIsHome ? homeCover : -homeCover;
  let result = "push";
  if (marginForSide > 0.05) result = "hit";
  else if (marginForSide < -0.05) result = "miss";
  return {
    league: row.league,
    kick: row.kick,
    away: row.away,
    home: row.home,
    side,
    edgeTo: row.edgeTo,
    marketHome: row.marketHome,
    modelHome: row.modelHome,
    actualMargin: actual,
    homePoints: row.homePoints,
    awayPoints: row.awayPoints,
    result,
    class: "RESEARCH",
    dataClass: row.dataClass,
    publicBetsAway: row.publicBetting?.betsAway ?? null,
    publicBetsHome: row.publicBetting?.betsHome ?? null,
    publicMoneyAway: row.publicBetting?.moneyAway ?? null,
    publicMoneyHome: row.publicBetting?.moneyHome ?? null,
    note: hasLean
      ? "Model lean graded vs stored Action Network consensus after final. Not an issued play."
      : "Market-favorite ATS vs stored consensus after final. Library grade. Not an issued play.",
  };
}

function stripInternal(r) {
  const { actualMargin, apiPublic, ...rest } = r;
  return rest;
}

function rate(hits, misses, pushes) {
  const n = hits + misses + pushes;
  return n ? Number(((hits + pushes * 0.5) / n).toFixed(3)) : null;
}

function rowKey(r) {
  return r.anId ? `an:${r.anId}` : `${r.league}:${norm(r.away)}:${norm(r.home)}:${String(r.kick).slice(0, 10)}`;
}

function mergeLibrary(fresh, prior) {
  const map = new Map();
  for (const r of prior) map.set(rowKey(r), r);
  for (const r of fresh) {
    const old = map.get(rowKey(r));
    if (old?.publicBetting && r.publicBetting) {
      const p = r.publicBetting;
      const o = old.publicBetting;
      if (p.moneyAway == null && o.moneyAway != null) {
        p.moneyAway = o.moneyAway;
        p.moneyHome = o.moneyHome;
        p.moneyQuality = o.moneyQuality;
        p.moneySource = o.moneySource || p.moneySource;
        p.wtMoneyAway = p.wtMoneyAway ?? o.wtMoneyAway ?? null;
        p.wtMoneyHome = p.wtMoneyHome ?? o.wtMoneyHome ?? null;
        p.saoMoneyAway = p.saoMoneyAway ?? o.saoMoneyAway ?? null;
        p.saoMoneyHome = p.saoMoneyHome ?? o.saoMoneyHome ?? null;
        p.sbdMoneyAway = p.sbdMoneyAway ?? o.sbdMoneyAway ?? null;
        p.sbdMoneyHome = p.sbdMoneyHome ?? o.sbdMoneyHome ?? null;
        if (p.betsAway != null) p.divergence = p.moneyAway - p.betsAway;
        const extra = [];
        if ((o.source || "").includes("wagertalk") && !String(p.source || "").includes("wagertalk")) extra.push("persisted-wt");
        if ((o.source || "").includes("scoresandodds") && !String(p.source || "").includes("scoresandodds")) extra.push("persisted-sao");
        if ((o.source || "").includes("sportsbettingdime") && !String(p.source || "").includes("sportsbettingdime")) extra.push("persisted-sbd");
        if (extra.length) p.source = `${p.source}+${extra.join("+")}`.replace(/^none\+/, "");
      }
      if (p.betsAway == null && o.betsAway != null) {
        p.betsAway = o.betsAway;
        p.betsHome = o.betsHome;
        p.ticketQuality = o.ticketQuality;
      }
      if (p.tickets == null && o.tickets != null) p.tickets = o.tickets;
      if (p.overBets == null && o.overBets != null) p.overBets = o.overBets;
      if (p.overMoney == null && o.overMoney != null) p.overMoney = o.overMoney;
    }
    if (old && !r.spreadStddev && old.spreadStddev) r.spreadStddev = old.spreadStddev;
    if (old && r.lineMovement === 0 && old.lineMovement) r.lineMovement = old.lineMovement;
    map.set(rowKey(r), r);
  }
  return [...map.values()];
}

function buildTeamIntel(researchRows, library) {
  const map = new Map();
  function bucket(team, league) {
    const key = `${league}::${team}`;
    if (!map.has(key)) {
      map.set(key, {
        team,
        league,
        n: 0,
        hits: 0,
        misses: 0,
        pushes: 0,
        lastResult: null,
        lastKick: null,
        games: 0,
        upcoming: 0,
      });
    }
    return map.get(key);
  }
  for (const r of library) {
    for (const team of [r.home, r.away]) {
      const b = bucket(team, r.league);
      b.games += 1;
      if (!r.completed) b.upcoming += 1;
    }
  }
  const sorted = [...researchRows].sort((a, b) => String(a.kick).localeCompare(String(b.kick)));
  for (const r of sorted) {
    const side = bucket(r.side, r.league);
    side.n += 1;
    if (r.result === "hit") side.hits += 1;
    else if (r.result === "miss") side.misses += 1;
    else side.pushes += 1;
    side.lastResult = r.result;
    side.lastKick = r.kick;
  }
  const teams = [...map.values()]
    .map((t) => ({
      ...t,
      rate: rate(t.hits, t.misses, t.pushes),
    }))
    .sort((a, b) => b.n - a.n || a.team.localeCompare(b.team));
  return {
    generatedAt: new Date().toISOString(),
    policy:
      "Per-club research ATS vs the stored consensus after a final. This is a library, not an issued record. Do not quote it as the 75% target.",
    teamCount: teams.length,
    withGrades: teams.filter((t) => t.n > 0).length,
    teams,
  };
}

async function safeText(url, referer) {
  try {
    return await fetchText(url, referer);
  } catch (e) {
    console.error("skip", url, e.message);
    return "";
  }
}

async function safeJson(loader, label) {
  try {
    return await loader();
  } catch (e) {
    console.error("skip", label, e.message);
    return [];
  }
}

function weekLabel(weeks) {
  return weeks.map((w) => (w == null ? "current" : String(w))).join(",");
}

async function main() {
  const now = new Date().toISOString();
  const snapshot = readJson(join(ROOT, "src/data/snapshot.json"), {});
  const boardPrev = readJson(join(ROOT, "src/data/board.json"), {
    watch: [],
    highNoise: [],
    staleFpi: [],
    library: [],
  });
  const seed = readJson(join(ROOT, "src/data/public-betting-seed.json"), { nfl: [], ncaaf: [] });
  const health = readJson(join(ROOT, "src/data/api-health.json"), {});
  const contextPrev = readJson(join(ROOT, "src/data/context-layer.json"), { features: [] });
  const digestPrev = readJson(join(ROOT, "src/data/digest.json"), {});
  const tapePrev = readJson(join(ROOT, "src/data/public-betting-tape.json"), { snapshots: [] });
  const priorLibraryFile = readJson(join(ROOT, "src/data/library.json"), { rows: [] });

  const priorIndex = [];
  for (const key of ["watch", "highNoise", "staleFpi", "library", "observe"]) {
    for (const r of boardPrev[key] || []) priorIndex.push(r);
  }
  function findPrior(home, away) {
    return priorIndex.find((r) => namesMatch(r.home, home) && namesMatch(r.away, away)) || null;
  }

  const nflFpi = snapshot.nflFpi || [];
  const ncaafFpi = snapshot.ncaafFpi || [];

  const [
    nflGames,
    ncaafGames,
    coversNflHtml,
    coversNcaafHtml,
    sbrNflHtml,
    sbrNcaafHtml,
    wtHtml,
    saoNflHtml,
    saoNcaafHtml,
    sbdNfl,
    sbdNcaaf,
    espnNfl,
    espnNcaaf,
  ] = await Promise.all([
    loadAnLeague("https://api.actionnetwork.com/web/v1/scoreboard/nfl", "NFL", NFL_WEEKS),
    loadAnLeague("https://api.actionnetwork.com/web/v1/scoreboard/ncaaf", "NCAAF", NCAAF_WEEKS),
    safeText("https://contests.covers.com/consensus/topconsensus/nfl/overall", "https://www.covers.com/"),
    safeText("https://contests.covers.com/consensus/topconsensus/ncaaf/overall", "https://www.covers.com/"),
    safeText("https://www.sportsbookreview.com/betting-odds/nfl-football/", "https://www.sportsbookreview.com/"),
    safeText(
      "https://www.sportsbookreview.com/betting-odds/college-football/",
      "https://www.sportsbookreview.com/",
    ),
    safeText("https://www.wagertalk.com/odds", "https://www.wagertalk.com/"),
    safeText("https://www.scoresandodds.com/nfl/consensus-picks", "https://www.scoresandodds.com/"),
    safeText("https://www.scoresandodds.com/ncaaf/consensus-picks", "https://www.scoresandodds.com/"),
    safeJson(() => loadSbd("nfl", "NFL"), "sbd-nfl"),
    safeJson(() => loadSbd("ncaafb", "NCAAF"), "sbd-ncaaf"),
    safeJson(() => loadEspn("nfl", "NFL"), "espn-nfl"),
    safeJson(() => loadEspn("college-football", "NCAAF"), "espn-ncaaf"),
  ]);

  const all = [...nflGames, ...ncaafGames];
  const espnRows = [...espnNfl, ...espnNcaaf];
  const espnOverlayN = overlayEspn(all, espnRows);
  const coversRows = [
    ...parseCoversTable(coversNflHtml, "NFL"),
    ...parseCoversTable(coversNcaafHtml, "NCAAF"),
  ];
  const sbrRows = [...parseSbr(sbrNflHtml), ...parseSbr(sbrNcaafHtml)];
  const wtRows = parseWagerTalk(wtHtml);
  const saoRows = [...parseSao(saoNflHtml, "NFL"), ...parseSao(saoNcaafHtml, "NCAAF")];
  const sbdRows = [...sbdNfl, ...sbdNcaaf];

  const abbrIndex = new Map();
  for (const g of all) {
    if (g.homeAbbr) abbrIndex.set(`${g.league}:${String(g.homeAbbr).toLowerCase()}`, g.home);
    if (g.awayAbbr) abbrIndex.set(`${g.league}:${String(g.awayAbbr).toLowerCase()}`, g.away);
  }

  const fresh = [];
  for (const g of all) {
    const fpiList = g.league === "NFL" ? nflFpi : ncaafFpi;
    const fh = fpiLookup(fpiList, g.home);
    const fa = fpiLookup(fpiList, g.away);
    const seedRows = g.league === "NFL" ? seed.nfl : seed.ncaaf;
    const prior = findPrior(g.home, g.away);
    const pub = attachPublic(
      g,
      seedRows,
      coversRows,
      sbrRows,
      wtRows,
      saoRows,
      sbdRows,
      abbrIndex,
      prior?.publicBetting,
    );
    const row = buildRow(g, fh?.fpi ?? null, fa?.fpi ?? null, prior, pub);
    row.actualMargin = g.actualMargin;
    fresh.push(row);
  }

  const library = mergeLibrary(fresh, [
    ...(Array.isArray(priorLibraryFile.rows) ? priorLibraryFile.rows : []),
    ...(boardPrev.library || []),
  ]);
  const upcoming = library.filter((r) => !r.completed);
  const completedRows = library.filter((r) => r.completed);
  const watch = upcoming.filter((r) => r.dataClass === "WATCH");
  const highNoise = upcoming.filter((r) => r.dataClass === "HIGH_NOISE");
  const staleFpi = upcoming.filter((r) => r.dataClass === "STALE_FPI");
  const observe = upcoming.filter((r) => r.marketHome != null);
  const aligned = upcoming
    .filter((r) => r.dataClass === "ALIGNED")
    .map((r) => ({
      league: r.league,
      away: r.away,
      home: r.home,
      marketHome: r.marketHome,
      modelHome: r.modelHome,
      total: r.total,
      note: "Inside 3-pt band. Library row, not a play.",
    }));

  const researchRows = [];
  for (const g of library) {
    const graded = gradeRow(g);
    if (graded) researchRows.push(graded);
  }
  const hits = researchRows.filter((r) => r.result === "hit").length;
  const misses = researchRows.filter((r) => r.result === "miss").length;
  const pushes = researchRows.filter((r) => r.result === "push").length;
  const n = researchRows.length;
  const clean = researchRows.filter(
    (r) =>
      r.dataClass === "WATCH" ||
      (r.marketHome != null && Math.abs(r.marketHome) < 14 && r.dataClass !== "STALE_FPI"),
  );
  const cleanHits = clean.filter((r) => r.result === "hit").length;
  const cleanMiss = clean.filter((r) => r.result === "miss").length;
  const cleanPush = clean.filter((r) => r.result === "push").length;

  const ticketN = library.filter((r) => r.publicBetting?.betsAway != null).length;
  const moneyN = library.filter((r) => r.publicBetting?.moneyAway != null).length;
  const volumeN = library.filter((r) => r.tickets).length;
  const sbrN = library.filter((r) => r.publicBetting?.sbrAway != null).length;
  const coversN = library.filter((r) => r.publicBetting?.coversAway != null).length;
  const wtN = library.filter((r) => r.publicBetting?.wtMoneyAway != null || r.publicBetting?.moneySource === "wagertalk").length;
  const saoMoneyN = library.filter((r) => r.publicBetting?.saoMoneyAway != null || r.publicBetting?.moneySource === "scoresandodds").length;
  const saoMatchN = library.filter((r) => r.publicBetting?.saoBetsAway != null || r.publicBetting?.saoMoneyAway != null).length;
  const sbdMatchN = library.filter((r) => r.publicBetting?.sbdBetsAway != null || r.publicBetting?.sbdMoneyAway != null).length;
  const sbdMoneyN = library.filter((r) => r.publicBetting?.sbdMoneyAway != null || r.publicBetting?.moneySource === "sportsbettingdime").length;
  const divN = library.filter((r) => r.publicBetting?.divergence != null && Math.abs(r.publicBetting.divergence) >= 10).length;
  const nflLib = library.filter((r) => r.league === "NFL");
  const ncaafLib = library.filter((r) => r.league === "NCAAF");
  const teamsCovered = new Set(library.flatMap((r) => [r.home, r.away])).size;
  const teamIntel = buildTeamIntel(researchRows, library);

  const tape = {
    generatedAt: now,
    source: "sportsbettingdime.com (ticket % + money/handle %) + scoresandodds.com + wagertalk.com/odds",
    snapshots: [
      ...(tapePrev.snapshots || []).slice(-50),
      {
        at: now,
        nfl: sbdNfl.length,
        ncaaf: sbdNcaaf.length,
        scoresandodds: saoRows.length,
        wagertalk: wtRows.length,
        rows: sbdRows.slice(0, 40).map((r) => ({
          league: r.league,
          away: r.away,
          home: r.home,
          betsAway: r.betsAway,
          moneyAway: r.moneyAway,
        })),
      },
    ],
  };

  const publicBetting = {
    generatedAt: now,
    source:
      "SportsBettingDime (ticket % + money/handle % on the live NFL/NCAAF slate) + ScoresAndOdds consensus + Action Network scoreboard (ticket volume) + WagerTalk consensus + SBR spread pick % + Covers contest pick %",
    methodology:
      "Ticket/bet % prefers SportsBettingDime spread betsPercentage, then Action Network public figures, then ScoresAndOdds, then WagerTalk, then SBR pick %, then Covers contest pick %. Money/handle % prefers SportsBettingDime stakePercentage, then ScoresAndOdds, then WagerTalk, then Action Network featured-game money %, then the last persisted snapshot so completed games keep their split. Covers/SBR are pick shares, not licensed sportsbook handle. Divergence = money% − ticket% on the away side when both exist. A 10-pt+ divergence is a research flag, not a ticket.",
    quality: moneyN >= 20 ? "provisional" : ticketN >= 20 ? "provisional" : "missing",
    coverage: {
      library: library.length,
      ticketPct: ticketN,
      moneyPct: moneyN,
      ticketVolume: volumeN,
      sbrPicks: sbrN,
      coversPicks: coversN,
      wagertalkLive: wtRows.length,
      wagertalkMatched: wtN,
      scoresandoddsLive: saoRows.length,
      scoresandoddsMatched: saoMatchN,
      scoresandoddsMoney: saoMoneyN,
      sportsbettingdimeLive: sbdRows.length,
      sportsbettingdimeMatched: sbdMatchN,
      sportsbettingdimeMoney: sbdMoneyN,
      divergenceFlags: divN,
      nflTicket: nflLib.filter((r) => r.publicBetting?.betsAway != null).length,
      nflMoney: nflLib.filter((r) => r.publicBetting?.moneyAway != null).length,
      ncaafTicket: ncaafLib.filter((r) => r.publicBetting?.betsAway != null).length,
      ncaafMoney: ncaafLib.filter((r) => r.publicBetting?.moneyAway != null).length,
    },
    rows: library
      .filter((r) => {
        const p = r.publicBetting || {};
        return p.betsAway != null || p.moneyAway != null || p.tickets != null;
      })
      .map((r) => ({
        league: r.league,
        away: r.away,
        home: r.home,
        kick: r.kick,
        ...r.publicBetting,
        marketHome: r.marketHome,
      })),
  };

  const recentCompleted = [...completedRows]
    .sort((a, b) => String(b.kick).localeCompare(String(a.kick)))
    .slice(0, 160);
  const libraryPreview = recentCompleted;

  const board = {
    issuedPlays: [],
    watch: watch.map(stripInternal),
    highNoise: highNoise.map(stripInternal),
    staleFpi: staleFpi.map(stripInternal),
    observe: observe.map(stripInternal),
    library: libraryPreview.map(stripInternal),
    aligned,
    updated: now,
    source:
      "Action Network scoreboard (NFL current+weeks 1–18 + NCAAF current+weeks 0–13) + ESPN CDN finals overlay + FPI+HFA + SportsBettingDime/ScoresAndOdds/WagerTalk/SBR/Covers/AN public overlay. Full archive in library.json.",
    counts: {
      watch: watch.length,
      highNoise: highNoise.length,
      staleFpi: staleFpi.length,
      observe: observe.length,
      library: library.length,
      issued: 0,
      graded: 0,
      upcoming: upcoming.length,
      completed: completedRows.length,
      teamsCovered,
      nfl: nflLib.length,
      ncaaf: ncaafLib.length,
      moneyPct: moneyN,
      ticketPct: ticketN,
      divergenceFlags: divN,
      espnOverlay: espnOverlayN,
    },
  };

  const research = {
    generatedAt: now,
    policy:
      "Research grades are library/WATCH observations vs the stored Action Network consensus after a final. They are not issued plays. Do not quote them as the 75% issued-ATS target.",
    pathTo30: {
      researchN: n,
      issuedN: 0,
      remainingResearch: Math.max(0, 30 - n),
      watchOnBoard: watch.length,
      observeOnBoard: observe.length,
      libraryOnBoard: library.length,
      teamsCovered,
      note:
        n >= 30
          ? `Research sample n=${n} (≥30). Issued 75% still requires human-approved issued sides. Clean-band diagnostic ${cleanHits}–${cleanMiss}–${cleanPush} (n=${clean.length}).`
          : `Library covers ${library.length} games / ${teamsCovered} teams. Research n=${n}. Issued n stays 0 until a human approves a cohort.`,
    },
    ats: { hits, misses, pushes, n, rate: rate(hits, misses, pushes) },
    cleanBand: {
      hits: cleanHits,
      misses: cleanMiss,
      pushes: cleanPush,
      n: clean.length,
      rate: rate(cleanHits, cleanMiss, cleanPush),
      note: "WATCH leans plus |spread|<14, excluding STALE_FPI blowouts. Still not issued.",
    },
    rows: researchRows,
  };

  const saoNote = `Bet/pick % on ${ticketN}/${library.length} library games. Money/handle % on ${moneyN} (SportsBettingDime live ${sbdRows.length}, matched ${sbdMatchN}; ScoresAndOdds live ${saoRows.length}; WagerTalk live ${wtRows.length}; ESPN finals overlay ${espnOverlayN}; prior snapshots persisted). Ticket volume on ${volumeN}. SBR ${sbrN}, Covers ${coversN}. ${divN} games show a 10-pt+ money−ticket divergence.`;
  const features = (contextPrev.features || []).map((f) => {
    if (f.id !== "public_betting") return f;
    return {
      id: "public_betting",
      label: "Public betting share",
      quality: moneyN >= 1 ? "provisional" : ticketN >= 20 ? "provisional" : "missing",
      source:
        "sportsbettingdime.com (ticket % + money/handle %) + scoresandodds.com + wagertalk.com + actionnetwork.com + sportsbookreview.com + covers.com contests",
      observedAt: now,
      note: saoNote,
    };
  });
  if (!features.some((f) => f.id === "public_betting")) {
    features.push({
      id: "public_betting",
      label: "Public betting share",
      quality: moneyN >= 1 ? "provisional" : "missing",
      source: "sportsbettingdime + scoresandodds + wagertalk + actionnetwork + sbr + covers",
      observedAt: now,
      note: saoNote,
    });
  }
  const contextLayer = { ...contextPrev, generatedAt: now, features };

  health.generatedAt = now;
  health.actionnetwork = {
    status: all.length ? "healthy" : "degraded",
    lastSuccessAt: now,
    httpStatus: 200,
    nflEvents: nflGames.length,
    ncaafEvents: ncaafGames.length,
    ncaafWeek1Finals: ncaafGames.filter((g) => g.week === 1 && g.completed).length,
    ticketPct: ticketN,
    moneyPct: moneyN,
    reason: `Scoreboard NFL ${nflGames.length} (weeks ${weekLabel(NFL_WEEKS)}), NCAAF ${ncaafGames.length} (weeks ${weekLabel(NCAAF_WEEKS)}). Ticket/pick % ${ticketN}, money % ${moneyN}.`,
  };
  health.covers = {
    status: coversRows.length ? "healthy" : "degraded",
    lastSuccessAt: now,
    httpStatus: coversNflHtml ? 200 : 0,
    rows: coversRows.length,
    reason: `Contest pick % on ${coversRows.length} matchups (not licensed handle).`,
  };
  health.sbr = {
    status: sbrRows.length ? "healthy" : "degraded",
    lastSuccessAt: now,
    httpStatus: sbrNflHtml ? 200 : 0,
    rows: sbrRows.length,
    reason: `Consensus spread pick % on ${sbrN} matched library games.`,
  };
  health.wagertalk = {
    status: wtRows.length ? "healthy" : "degraded",
    lastSuccessAt: now,
    httpStatus: wtHtml ? 200 : 0,
    rows: wtRows.length,
    nfl: wtRows.filter((r) => r.league === "NFL").length,
    ncaaf: wtRows.filter((r) => r.league === "NCAAF").length,
    matchedMoney: wtN,
    reason: wtRows.length
      ? `Live consensus sheet: ${wtRows.length} football rows with ticket/money %. Matched onto ${wtN} library games. Weekday slates are thin; Thursday–Sunday fills the tape.`
      : "WagerTalk sheet returned no football ticket/money rows (weekday gap). SportsBettingDime is the primary handle feed.",
  };
  health.scoresandodds = {
    status: saoRows.length ? "healthy" : "degraded",
    lastSuccessAt: now,
    httpStatus: saoNflHtml ? 200 : 0,
    rows: saoRows.length,
    nfl: saoRows.filter((r) => r.league === "NFL").length,
    ncaaf: saoRows.filter((r) => r.league === "NCAAF").length,
    matched: saoMatchN,
    money: saoMoneyN,
    reason: saoRows.length
      ? `Consensus picks page: ${saoRows.length} spread cards with ticket + money % (NFL ${saoRows.filter((r) => r.league === "NFL").length}, NCAAF ${saoRows.filter((r) => r.league === "NCAAF").length}). Matched onto ${saoMatchN} library games, money on ${saoMoneyN}.`
      : "ScoresAndOdds consensus page returned no spread cards.",
  };
  health.sportsbettingdime = {
    status: sbdRows.length ? "healthy" : "degraded",
    lastSuccessAt: now,
    httpStatus: sbdRows.length ? 200 : 0,
    rows: sbdRows.length,
    nfl: sbdNfl.length,
    ncaaf: sbdNcaaf.length,
    matched: sbdMatchN,
    money: sbdMoneyN,
    reason: sbdRows.length
      ? `Live ticket % and money/handle % on ${sbdRows.length} games (NFL ${sbdNfl.length}, NCAAF ${sbdNcaaf.length}). Matched onto ${sbdMatchN} library games.`
      : "SportsBettingDime odds API returned no betting splits.",
  };
  health.espn = {
    ...(health.espn || {}),
    status: espnRows.length ? "healthy" : health.espn?.status || "degraded",
    lastSuccessAt: espnRows.length ? now : health.espn?.lastSuccessAt,
    fallbackActive: false,
    httpStatus: espnRows.length ? 200 : health.espn?.httpStatus ?? 0,
    scoreboard: espnRows.length ? "healthy" : health.espn?.scoreboard,
    nflEvents: espnNfl.length,
    ncaafEvents: espnNcaaf.length,
    nflFinals: espnNfl.filter((r) => r.completed).length,
    ncaafFinals: espnNcaaf.filter((r) => r.completed).length,
    overlayApplied: espnOverlayN,
    reason: `CDN scoreboard NFL ${espnNfl.length} (${espnNfl.filter((r) => r.completed).length} final), NCAAF ${espnNcaaf.length} (${espnNcaaf.filter((r) => r.completed).length} final). Overlayed ${espnOverlayN} library scores.`,
  };

  const nflFinals = nflLib.filter((r) => r.completed).length;
  const ncaafFinals = ncaafLib.filter((r) => r.completed).length;
  snapshot.honesty = `Library ${library.length} games / ${teamsCovered} clubs. NFL finals ${nflFinals}, NCAAF finals ${ncaafFinals}. Issued n=0. Research n=${n} is diagnostic, not the 75% issued target.`;
  snapshot.calendar = {
    ncaaf: `NCAAF current + weeks 0–13 on file (${ncaafLib.length} games, ${ncaafFinals} finals). Upcoming ${ncaafLib.filter((r) => !r.completed).length}.`,
    nfl: `NFL current + weeks 1–18 on file (${nflLib.length} games, ${nflFinals} finals). Upcoming ${nflLib.filter((r) => !r.completed).length}.`,
  };

  const digest = {
    ...digestPrev,
    week: 2,
    season: 2026,
    generatedAt: now,
    confidenceTier: "INSUFFICIENT",
    atsRecord: { hits: 0, misses: 0, pushes: 0, n: 0, rate: null },
    helpers: [
      `${observe.length} upcoming games in the research slate (entire posted NFL + NCAAF weeks), ${watch.length} inside the 3–7 pt issuance band.`,
      `Library covers ${teamsCovered} clubs across ${library.length} games. Research grades ${hits}–${misses}–${pushes} (n=${n}).`,
      `Public lean: bet/pick % on ${ticketN} games. Money/handle % on ${moneyN} (SportsBettingDime + ScoresAndOdds + WagerTalk + persisted). ESPN overlay filled ${espnOverlayN} finals. ${divN} games with a 10-pt+ divergence.`,
    ],
    hurters: [
      "Issued n remains 0 — 75% ATS is still a target, not a measured rate.",
      `${library.length - moneyN} library games still have no handle split (SportsBettingDime covers the live slate; completed weeks keep the last persisted snapshot).`,
      `${staleFpi.length} STALE_FPI and ${highNoise.length} HIGH_NOISE upcoming rows stay suppressed for issuance.`,
    ],
    modelAdjustments: ["Do not raise playThreshold until n≥30 issued and selective hit rate supports it"],
    topGamesNextWeek: [...watch]
      .sort((a, b) => a.kick.localeCompare(b.kick) || Number(b.edge) - Number(a.edge))
      .slice(0, 8)
      .map((w) => ({
        league: w.league,
        kick: w.kick,
        matchup: `${w.away} @ ${w.home}`,
        edge: w.edge,
        edgeTo: w.edgeTo,
        confidence: w.dataClass,
        dataClass: w.dataClass,
        marketHome: w.marketHome,
        modelHome: w.modelHome,
        nBooks: w.nBooks,
      })),
    narrativeStatus: digestPrev.narrativeStatus ?? "generated",
    aiNarrative: null,
    engine: digestPrev.engine ?? "FPI + HFA",
    summary: `Library ${library.length} games / ${teamsCovered} clubs. Research ${hits}–${misses}–${pushes} (n=${n}). Issued 0. Public lean on ${ticketN} games. Money % on ${moneyN} (SportsBettingDime + ScoresAndOdds + WagerTalk + persisted). ESPN overlay ${espnOverlayN} finals.`,
  };
  digest.aiNarrative = [
    `BIS Signal Desk, ${digest.season} week ${digest.week}. Engine: ${digest.engine}.`,
    "Issued ATS is 0-0-0 (n=0). The 75% target is not measurable. Do not quote a hit rate.",
    `${watch.length} rows sit in the research (WATCH) band. ${staleFpi.length} STALE_FPI and ${highNoise.length} HIGH_NOISE rows stay suppressed. Issued plays: 0.`,
    `Library ${library.length} games / ${teamsCovered} clubs. Research ${hits}-${misses}-${pushes} (n=${n}) vs stored consensus after finals — diagnostic, not issued.`,
    `Public lean: ticket/pick % on ${ticketN} games, money/handle % on ${moneyN} (SportsBettingDime + ScoresAndOdds + WagerTalk + persisted snapshots). ESPN overlay filled ${espnOverlayN} scores. ${divN} games show a 10-pt money-versus-tickets gap.`,
    "An LLM cannot promote a row to ISSUED. Human review and n>=30 graded issued sides remain hard gates.",
  ].join(" ");
  digest.narrativeStatus = "generated";
  digest.narrativeModel = "grok-4.6-desk";

  atomicWrite(join(ROOT, "src/data/board.json"), board);
  atomicWrite(join(ROOT, "src/data/library.json"), {
    generatedAt: now,
    policy: "Full research archive. Merged across refreshes. Not issued plays.",
    rows: library.map(stripInternal),
  });
  atomicWrite(join(ROOT, "src/data/research-ledger.json"), research);
  atomicWrite(join(ROOT, "src/data/public-betting.json"), publicBetting);
  atomicWrite(join(ROOT, "src/data/public-betting-tape.json"), tape);
  atomicWrite(join(ROOT, "src/data/context-layer.json"), contextLayer);
  atomicWrite(join(ROOT, "src/data/api-health.json"), health);
  atomicWrite(join(ROOT, "src/data/snapshot.json"), snapshot);
  atomicWrite(join(ROOT, "src/data/team-intel.json"), teamIntel);
  atomicWrite(join(ROOT, "src/data/digest.json"), digest);

  mkdirSync(join(ROOT, "public/data"), { recursive: true });
  atomicWrite(join(ROOT, "public/data/board.json"), board);
  atomicWrite(join(ROOT, "public/data/api-health.json"), health);
  atomicWrite(join(ROOT, "public/data/snapshot.json"), snapshot);
  atomicWrite(join(ROOT, "public/data/digest.json"), digest);

  console.log(
    JSON.stringify({
      library: library.length,
      observe: observe.length,
      watch: watch.length,
      highNoise: highNoise.length,
      staleFpi: staleFpi.length,
      aligned: aligned.length,
      completed: completedRows.length,
      teamsCovered,
      espnOverlay: espnOverlayN,
      espnNfl: espnNfl.length,
      espnNcaaf: espnNcaaf.length,
      ticketPct: ticketN,
      moneyPct: moneyN,
      sportsbettingdimeLive: sbdRows.length,
      sportsbettingdimeMatched: sbdMatchN,
      scoresandoddsLive: saoRows.length,
      scoresandoddsMatched: saoMatchN,
      wagertalkLive: wtRows.length,
      wagertalkMatched: wtN,
      sbrPicks: sbrN,
      coversPicks: coversN,
      divergenceFlags: divN,
      researchN: n,
      research: `${hits}-${misses}-${pushes}`,
      cleanN: clean.length,
      clean: `${cleanHits}-${cleanMiss}-${cleanPush}`,
      nfl: { games: nflGames.length, finals: nflFinals },
      ncaaf: { games: ncaafGames.length, finals: ncaafFinals },
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
