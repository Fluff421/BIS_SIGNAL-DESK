#!/usr/bin/env node
/** Weekly intelligence brief from ledger + board + model. node scripts/generate-digest.mjs */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const staged = join(dirname(path), `.${randomBytes(6).toString("hex")}.tmp`);
  writeFileSync(staged, text);
  renameSync(staged, path);
}
function load(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}
function confidenceTier(n) {
  if (n >= 30) return "HIGH";
  if (n >= 15) return "MEDIUM";
  if (n >= 5) return "LOW";
  return "INSUFFICIENT";
}
function buildHelpersHurters(ledger, board) {
  const helpers = [], hurters = [];
  const ats = ledger?.regular?.ats || {};
  const n = ats.n || 0;
  const buckets = ledger?.edgeBuckets || {};
  if (n === 0) {
    hurters.push("No graded sides yet — 75% ATS is not measurable (need n≥30).");
    hurters.push("Ensemble remains unfitted (fittedOn2026=false).");
  }
  if (buckets["15+"]) {
    const b = buckets["15+"];
    const t = b.hits + b.misses;
    if (t > 0 && b.hits / t < 0.5) hurters.push(`Edges 15+: ${b.hits}-${b.misses} — likely STALE_FPI / name mismatch noise.`);
  }
  if (buckets["3-7"]) {
    const b = buckets["3-7"];
    const t = b.hits + b.misses;
    if (t > 0 && b.hits / t >= 0.55) helpers.push(`Edges 3–7 pts: ${b.hits}-${b.misses} — primary research band.`);
  }
  const stale = (board?.watch || []).filter((w) => w.confidence === "STALE_FPI").length;
  if (stale > 0) hurters.push(`${stale} STALE_FPI rows — suppress from play consideration.`);
  if (!helpers.length) helpers.push("Process discipline: empty issuedPlays until sample supports plays.");
  if (!hurters.length) hurters.push("No dominant hurter yet — keep grading honestly.");
  return { helpers, hurters };
}
async function main() {
  const ledger = load("src/data/ledger.json") || {};
  const board = load("src/data/board.json") || { watch: [] };
  const model = load("src/data/model.json") || {};
  const ats = ledger.regular?.ats || { hits: 0, misses: 0, pushes: 0, n: 0, rate: null };
  const { helpers, hurters } = buildHelpersHurters(ledger, board);
  const top = [...(board.watch || [])].filter((w) => w.confidence !== "STALE_FPI").sort((a, b) => (b.edge || 0) - (a.edge || 0)).slice(0, 5);
  const base = {
    week: 1, season: ledger.season || 2026, generatedAt: new Date().toISOString(),
    confidenceTier: confidenceTier(ats.n || 0), atsRecord: ats, helpers, hurters,
    modelAdjustments: [model.ensembleSpec?.fittedOn2026 ? "Ensemble fittedOn2026=true" : "Do not raise playThreshold until n≥30"],
    topGamesNextWeek: top.map((t) => ({ league: t.league, kick: t.kick, matchup: `${t.away} @ ${t.home}`, edge: t.edge, edgeTo: t.edgeTo, confidence: t.confidence || "WATCH", marketHome: t.marketHome, modelHome: t.modelHome })),
    engine: model.engine, watchThreshold: model.watchThreshold,
    summary: `BIS desk: ATS ${ats.hits}-${ats.misses}-${ats.pushes} (n=${ats.n}). Confidence ${confidenceTier(ats.n || 0)}. Helpers: ${helpers.join("; ")}. Hurters: ${hurters.join("; ")}.`,
  };
  atomicWrite(join(ROOT, "src/data/digest.json"), JSON.stringify(base, null, 2) + "\n");
  const md = `# Weekly digest — ${base.generatedAt.slice(0, 10)}\n\n**Confidence:** ${base.confidenceTier}\n\n**ATS:** ${ats.hits}-${ats.misses}-${ats.pushes}\n\n## Helpers\n${helpers.map((h) => `- ${h}`).join("\n")}\n\n## Hurters\n${hurters.map((h) => `- ${h}`).join("\n")}\n\n## Summary\n${base.summary}\n`;
  if (existsSync(join(ROOT, "public/data"))) atomicWrite(join(ROOT, "public/data/digest.md"), md);
  console.log(`digest written confidence=${base.confidenceTier} n=${ats.n}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
