#!/usr/bin/env node
/**
 * Hand a staged file over to a path another agent reads, in one step.
 * rename(2) is atomic within one filesystem.
 */
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function parseWriteAtomicArgs(argv) {
  const [staged, target, ...rest] = argv;
  if (!staged || !target) {
    return { error: "usage: node scripts/write-atomic.mjs <staged-file> <target>" };
  }
  if (rest.length > 0) return { error: `unexpected argument: ${rest[0]}` };
  return { staged, target };
}

function isInside(dir, file) {
  const rel = relative(dir, file);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

export function stagingError({ staged, target, publicDir }) {
  if (staged === target) return `staged file and target are the same path: ${target}`;
  if (isInside(publicDir, staged)) {
    return `stage outside ${publicDir} (vite build ships that directory verbatim): ${staged}`;
  }
  return null;
}

export function handOver(staged, target, { rename = renameSync } = {}) {
  if (!existsSync(staged)) {
    throw Object.assign(new Error(`staged file is missing: ${staged}`), { code: "ENOENT" });
  }
  mkdirSync(dirname(target), { recursive: true });
  try {
    rename(staged, target);
  } catch (err) {
    if (err?.code === "EXDEV") {
      throw new Error(
        `${staged} and ${target} are on different filesystems; stage under the workspace (e.g. .grok/) so rename(2) is atomic.`,
      );
    }
    throw err;
  }
}

function main() {
  const parsed = parseWriteAtomicArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(parsed.error);
    process.exit(1);
  }
  const staged = resolve(parsed.staged);
  const target = resolve(ROOT, parsed.target);
  const publicDir = join(ROOT, "public");
  const err = stagingError({ staged, target, publicDir });
  if (err) {
    console.error(err);
    process.exit(1);
  }
  handOver(staged, target);
  console.log(JSON.stringify({ ok: true, target }));
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("write-atomic.mjs")) {
  main();
}
