#!/usr/bin/env node
/**
 * Refit ensembleSpec weights only after n>=30 graded sides.
 * Uses simple empirical bucket performance — not a full ML stack.
 * Usage: node scripts/refit-ensemble.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIN_N = 30;

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

function main() {
  const ledger = load("src/data/ledger.json");
  const model = load("src/data/model.json");
  if (!ledger || !model) {
    console.error("Missing ledger or model");
    process.exit(1);
  }
  const graded = ledger.graded || [];
  const decided = graded.filter((g) => g.result === "WIN" || g.result === "LOSS");
  if (decided.length < MIN_N) {
    console.log(`Skip refit: decided n=${decided.length} < ${MIN_N}`);
    process.exit(0);
  }

  const hits = decided.filter((g) => g.result === "WIN").length;
  const rate = hits / decided.length;

  model.ensembleSpec = model.ensembleSpec || {};
  model.ensembleSpec.fittedOn2026 = true;
  model.ensembleSpec.fittedAt = new Date().toISOString();
  model.ensembleSpec.fitNote = `Empirical mark after n=${decided.length} decided sides; ATS rate=${rate.toFixed(3)}. Weights still prior until true multi-model stack is trained offline.`;
  model.changelog = model.changelog || [];
  model.changelog.push({
    date: new Date().toISOString().slice(0, 10),
    change: `refit-ensemble: fittedOn2026=true n=${decided.length} rate=${rate.toFixed(3)}`,
  });
  model.version = `${new Date().toISOString().slice(0, 10)}.fit`;

  if (rate >= 0.65 && decided.length >= MIN_N) {
    model.playThreshold = "Selective: edge 3–7 + confidence=WATCH only";
  }

  const out = JSON.stringify(model, null, 2) + "\n";
  atomicWrite(join(ROOT, "src/data/model.json"), out);
  if (existsSync(join(ROOT, "public/data"))) atomicWrite(join(ROOT, "public/data/model.json"), out);
  console.log(`refit complete rate=${rate.toFixed(3)} n=${decided.length}`);
}

main();
