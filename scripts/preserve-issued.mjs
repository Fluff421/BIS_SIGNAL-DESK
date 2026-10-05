/**
 * Carry issued plays across board rebuilds.
 * A refresh may update score, status, and closing line. It must not drop the
 * row, move it back to watch, or change approvedSide.
 */

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function issuedKey(row) {
  if (row?.eventId) return `id:${row.eventId}`;
  return `k:${row?.kick}|${norm(row?.home)}|${norm(row?.away)}`;
}

export function kickHomeAwayKey(row) {
  return `k:${row?.kick}|${norm(row?.home)}|${norm(row?.away)}`;
}

function livePool(nextBoard) {
  const lists = [
    nextBoard?.watch,
    nextBoard?.observe,
    nextBoard?.library,
    nextBoard?.highNoise,
    nextBoard?.staleFpi,
    nextBoard?.aligned,
  ];
  const out = [];
  for (const list of lists) {
    if (Array.isArray(list)) out.push(...list);
  }
  return out;
}

function findLive(issued, pool) {
  const id = issued.eventId ? `id:${issued.eventId}` : null;
  const kh = kickHomeAwayKey(issued);
  return (
    pool.find((r) => (id && issuedKey(r) === id) || kickHomeAwayKey(r) === kh) || null
  );
}

export function preserveIssuedPlays(prevIssued, nextBoard = {}) {
  const prev = Array.isArray(prevIssued) ? prevIssued : [];
  const pool = livePool(nextBoard);
  return prev.map((issued) => {
    const live = findLive(issued, pool);
    const next = { ...issued };
    if (live) {
      if (live.homePoints != null) next.homePoints = live.homePoints;
      if (live.awayPoints != null) next.awayPoints = live.awayPoints;
      if (live.status) next.status = live.status;
      if (live.completed != null) next.completed = live.completed;
      if (live.marketHome != null) next.closingMarketHome = live.marketHome;
    }
    next.approvedSide = issued.approvedSide;
    next.issuedAt = issued.issuedAt;
    next.issueNote = issued.issueNote ?? issued.note;
    next.eventId = issued.eventId;
    return next;
  });
}

export function dropIssuedFromList(list, issued) {
  if (!Array.isArray(list) || !issued?.length) return list || [];
  const ids = new Set(issued.map(issuedKey));
  const khs = new Set(issued.map(kickHomeAwayKey));
  return list.filter((r) => !ids.has(issuedKey(r)) && !khs.has(kickHomeAwayKey(r)));
}
