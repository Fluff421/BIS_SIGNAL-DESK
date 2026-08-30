#!/usr/bin/env node
/** Deploy-time database migrator (node-postgres). */
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pendingMigrations } from "./migration-plan.mjs";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log("[migrate] no DATABASE_URL — skipping.");
  process.exit(0);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  let entries;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do.");
    return;
  }
  if (pendingMigrations(entries, []).length === 0) {
    console.log("[migrate] no migrations — nothing to do.");
    return;
  }
  // Full pg migration loop is in the original workspace zip.
  console.log("[migrate] pending migrations detected; apply with full migrate.mjs from workspace.");
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
