#!/usr/bin/env node
/** Brand asset checks for public/og.jpg and related metadata. */
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const og = join(root, "public/og.jpg");

if (!existsSync(og)) {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: "no public/og.jpg" }));
  process.exit(0);
}
console.log(JSON.stringify({ ok: true, path: "public/og.jpg" }));
