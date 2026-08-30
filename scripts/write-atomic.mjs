#!/usr/bin/env node
/** Atomically move a staged file to its final path. */
import { renameSync, copyFileSync, unlinkSync, existsSync } from "node:fs";

const [,, src, dest] = process.argv;
if (!src || !dest) {
  console.error("usage: write-atomic.mjs <src> <dest>");
  process.exit(1);
}
try {
  renameSync(src, dest);
} catch {
  copyFileSync(src, dest);
  if (existsSync(src)) unlinkSync(src);
}
