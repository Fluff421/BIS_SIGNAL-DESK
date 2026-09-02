#!/usr/bin/env node
/**
 * Weekly intelligence brief from ledger + board + model.
 * Optional GROK_API_KEY → aiNarrative via api.x.ai (model grok-4.6)
 * Usage: node scripts/generate-digest.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GROK_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY || "";
const GROK_MODEL = process.env.GROK_MODEL || "grok-4.6";

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
  const helpers = [];
  const hurters = [];
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
    if (t > 0 && b.hits / t < 0.5) {
      hurters.push(`Edges 15+: ${b.hits}-${b.misses} — likely STALE_FPI / name mismatch noise.`);
    }
  }
  if (buckets["3-7"]) {
    const b = buckets["3-7"];
    const t = b.hits + b.misses;
    if (t > 0 && b.hits / t >= 0.55) {
      helpers.push(`Edges 3–7 pts: ${b.hits}-${b.misses} — primary research band.`);
    }
  }
  const staleWatch = (board?.watch || []).filter((w) => w.confidence === "STALE_FPI").length;
  const staleExtra = (board?.staleFpi || []).length;
  if (staleWatch + staleExtra > 0) {
    hurters.push(`${staleWatch + staleExtra} STALE_FPI rows — suppress from play consideration.`);
  }
  const watch = (board?.watch || []).filter((w) => w.confidence === "WATCH" || !w.confidence);
  if (watch.length) helpers.push(`${watch.length} rows in primary watch band (confidence WATCH or unset).`);

  if (!helpers.length) helpers.push("Process discipline: empty issuedPlays until sample supports plays.");
  if (!hurters.length) hurters.push("No dominant hurter yet — keep grading honestly.");

  return { helpers, hurters };
}

async function callGrokNarrative(base) {
  if (!GROK_KEY) {
    console.error("[digest] GROK_API_KEY not set — skipping AI narrative");
    return null;
  }
  const prompt = [
    "You are the BIS Signal Desk intelligence analyst for the 2026 NCAAF and NFL seasons.",
    "Your job is to write a concise, direct 250-word weekly intelligence brief based on the data below.",
    "Identify exactly which data points are HELPING the model's accuracy and which are HURTING it.",
    "Call out STALE_FPI rows by name if present. Comment on edge bucket performance if n > 0.",
    "Name the top 3 games to watch this week and explain WHY the model likes each one.",
    "End with a one-sentence confidence statement based on the sample size.",
    "Do not use vague language. Be specific about teams, edges, and numbers.",
    "",
    "DATA:",
    JSON.stringify(
      {
        atsRecord: base.atsRecord,
        confidenceTier: base.confidenceTier,
        helpers: base.helpers,
        hurters: base.hurters,
        topGamesNextWeek: base.topGamesNextWeek,
        modelAdjustments: base.modelAdjustments,
        watchThreshold: base.watchThreshold,
        engine: base.engine,
      },
      null,
      2,
    ),
  ].join("\n");

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROK_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[digest] Grok API error ${res.status} model=${GROK_MODEL}: ${err.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    const narrative = data.choices?.[0]?.message?.content ?? null;
    console.error(`[digest] Grok narrative model=${GROK_MODEL} chars=${narrative?.length ?? 0}`);
    return narrative;
  } catch (e) {
    console.error(`[digest] Grok API fetch failed: ${e.message}`);
    return null;
  }
}

async function main() {
  const ledger = load("src/data/ledger.json") || {};
  const board = load("src/data/board.json") || { watch: [] };
  const model = load("src/data/model.json") || {};
  const ats = ledger.regular?.ats || { hits: 0, misses: 0, pushes: 0, n: 0, rate: null };
  const { helpers, hurters } = buildHelpersHurters(ledger, board);
  const top = [...(board.watch || [])]
    .filter((w) => w.confidence !== "STALE_FPI")
    .sort((a, b) => (b.edge || 0) - (a.edge || 0))
    .slice(0, 5);

  const base = {
    week: 1,
    season: ledger.season || 2026,
    generatedAt: new Date().toISOString(),
    confidenceTier: confidenceTier(ats.n || 0),
    atsRecord: ats,
    helpers,
    hurters,
    modelAdjustments: [
      model.ensembleSpec?.fittedOn2026
        ? "Ensemble marked fittedOn2026=true"
        : "Do not raise playThreshold until n≥30 and selective hit rate supports it",
    ],
    topGamesNextWeek: top.map((t) => ({
      league: t.league,
      kick: t.kick,
      matchup: `${t.away} @ ${t.home}`,
      edge: t.edge,
      edgeTo: t.edgeTo,
      confidence: t.confidence || "WATCH",
      marketHome: t.marketHome,
      modelHome: t.modelHome,
    })),
    engine: model.engine,
    watchThreshold: model.watchThreshold,
  };

  base.aiNarrative = await callGrokNarrative(base);
  base.summary =
    base.aiNarrative ||
    `BIS desk week snapshot: ATS ${ats.hits}-${ats.misses}-${ats.pushes} (n=${ats.n}, rate=${ats.rate ?? "n/a"}). Confidence ${base.confidenceTier}. Helpers: ${helpers.join("; ")}. Hurters: ${hurters.join("; ")}.`;

  const out = JSON.stringify(base, null, 2) + "\n";
  atomicWrite(join(ROOT, "src/data/digest.json"), out);

  const md = `# Weekly digest — ${base.generatedAt.slice(0, 10)}\n\n**Confidence:** ${base.confidenceTier}\n\n**ATS:** ${ats.hits}-${ats.misses}-${ats.pushes} (n=${ats.n})\n\n## Helpers\n${helpers.map((h) => `- ${h}`).join("\n")}\n\n## Hurters\n${hurters.map((h) => `- ${h}`).join("\n")}\n\n## Summary\n${base.summary}\n`;
  if (existsSync(join(ROOT, "public/data"))) {
    atomicWrite(join(ROOT, "public/data/digest.md"), md);
  }
  console.log(`digest written confidence=${base.confidenceTier} n=${ats.n} ai=${base.aiNarrative ? "yes" : "no"} model=${GROK_MODEL}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
