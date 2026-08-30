#!/usr/bin/env node
/**
 * Brand-asset gate: canvas apps must ship a custom share card.
 *   node scripts/brand-check.mjs [--game] [--placeholder-ok] [--root <dir>]
 */
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OG_SITE_REL_PATH, readOgSite, siteHasCustomCard } from "./grok-pwa-shared.mjs";

export const MAX_CARD_BYTES = 600 * 1024;
export const OG_PENDING_REL_PATH = ".grok/og-pending";
export const OG_PENDING_MAX_AGE_MS = 10 * 60 * 1000;

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

function brandWarningsOnDisk({ hasCanvas, workspaceRoot, cardRequired = false }) {
  const warnings = [];
  const site = readOgSite(workspaceRoot);
  const cardPath = join(workspaceRoot, "public/og.jpg");
  const hasCard = existsSync(cardPath);

  if (hasCard) {
    const { size } = statSync(cardPath);
    if (size > MAX_CARD_BYTES) {
      warnings.push(`public/og.jpg is ${size} bytes (max ${MAX_CARD_BYTES})`);
    }
  }

  if (hasCanvas || cardRequired) {
    if (!hasCard) warnings.push("missing public/og.jpg");
    if (!siteHasCustomCard(site)) {
      warnings.push('src/lib/og/site.json should set "card": "custom"');
    }
  }

  if (siteDeclaresOgTypeGame(site) && !existsSync(join(workspaceRoot, "public/x-banner.jpg"))) {
    warnings.push("missing public/x-banner.jpg for x:game");
  }

  return warnings;
}

export function computeBrandWarnings({
  hasCanvas,
  workspaceRoot = process.cwd(),
  now = Date.now(),
}) {
  if (ogPendingActive(workspaceRoot, now)) return [];
  return brandWarningsOnDisk({ hasCanvas, workspaceRoot });
}

export function parseBrandCheckArgs(argv) {
  let root = process.cwd();
  let game = false;
  let placeholderOk = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") root = argv[++i] || root;
    else if (a.startsWith("--root=")) root = a.slice("--root=".length);
    else if (a === "--game") game = true;
    else if (a === "--placeholder-ok") placeholderOk = true;
  }
  return { workspaceRoot: root, game, placeholderOk };
}

const isMain = process.argv[1]?.endsWith("brand-check.mjs");
if (isMain) {
  const args = parseBrandCheckArgs(process.argv.slice(2));
  const warnings = brandWarningsOnDisk({
    hasCanvas: args.game,
    workspaceRoot: args.workspaceRoot,
    cardRequired: !args.placeholderOk,
  });
  console.log(JSON.stringify({ ok: warnings.length === 0, warnings }));
  process.exit(warnings.length === 0 ? 0 : 1);
}
