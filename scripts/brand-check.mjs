#!/usr/bin/env node
/** Brand asset checks for public/og.jpg and site metadata. */
import { existsSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_CARD_BYTES = 600 * 1024;
export const OG_PENDING_REL_PATH = ".grok/og-pending";
export const OG_PENDING_MAX_AGE_MS = 10 * 60 * 1000;
export const OG_SITE_REL_PATH = "src/lib/og/site.json";

export function siteDeclaresOgTypeGame(site) {
  return String(site?.type ?? "").toLowerCase() === "x:game";
}

export function ogPendingActive(workspaceRoot, now = Date.now()) {
  try {
    const { mtimeMs } = statSync(join(workspaceRoot, OG_PENDING_REL_PATH));
    return now - mtimeMs < OG_PENDING_MAX_AGE_MS;
  } catch {
    return false;
  }
}

function readOgSite(workspaceRoot) {
  try {
    return JSON.parse(readFileSync(join(workspaceRoot, OG_SITE_REL_PATH), "utf8"));
  } catch {
    return {};
  }
}

export function computeBrandWarnings({ hasCanvas, workspaceRoot = process.cwd(), now = Date.now() }) {
  if (ogPendingActive(workspaceRoot, now)) return [];
  const warnings = [];
  const card = join(workspaceRoot, "public/og.jpg");
  if (!existsSync(card) && hasCanvas) {
    warnings.push("missing public/og.jpg");
  } else if (existsSync(card)) {
    const { size } = statSync(card);
    if (size > MAX_CARD_BYTES) warnings.push(`public/og.jpg is ${size} bytes (max ${MAX_CARD_BYTES})`);
  }
  return warnings;
}

export function parseBrandCheckArgs(argv) {
  return { workspaceRoot: argv[0] || process.cwd() };
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv[1]?.endsWith("brand-check.mjs")) {
  const warnings = computeBrandWarnings({ hasCanvas: true, workspaceRoot: root });
  console.log(JSON.stringify({ ok: warnings.length === 0, warnings }));
  process.exit(warnings.length === 0 ? 0 : 1);
}
