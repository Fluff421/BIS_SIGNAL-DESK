#!/usr/bin/env node
/**
 * Loads .grok/app-env.json into process.env then runs the remaining argv as a command.
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  const envPath = join(root, ".grok", "app-env.json");
  const data = JSON.parse(readFileSync(envPath, "utf8"));
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      process.env[k] = String(v);
    }
  }
} catch {
  // optional
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: with-app-env.mjs <command> [...args]");
  process.exit(1);
}
const child = spawn(args[0], args.slice(1), { stdio: "inherit", shell: true, env: process.env });
child.on("exit", (code) => process.exit(code ?? 1));
