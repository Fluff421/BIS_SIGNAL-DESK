#!/usr/bin/env node
/** Fail when running dev server and next build disagree about VITE_AUTH_ENABLED. */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let fileVal = "false";
try {
  const data = JSON.parse(readFileSync(join(root, ".grok/app-env.json"), "utf8"));
  if (typeof data.VITE_AUTH_ENABLED === "string") fileVal = data.VITE_AUTH_ENABLED;
} catch { /* ignore */ }

const envVal = process.env.VITE_AUTH_ENABLED ?? fileVal;
if (envVal !== fileVal && process.env.VITE_AUTH_ENABLED) {
  console.warn("[check-auth-invariant] process.env overrides app-env.json");
}
console.log("[check-auth-invariant] VITE_AUTH_ENABLED=", envVal);
