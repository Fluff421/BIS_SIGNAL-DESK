#!/usr/bin/env node
/**
 * Copy the four issued board/ledger files into the git checkout and push main.
 * Local preview writes still count if git is unavailable.
 */
import { execFile } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const FILES = [
  "src/data/board.json",
  "public/data/board.json",
  "src/data/ledger.json",
  "public/data/ledger.json",
];

function gitRoot() {
  const candidates = [process.env.BIS_GIT_ROOT, "/tmp/bis-main"].filter(Boolean);
  for (const root of candidates) {
    if (existsSync(join(root, ".git"))) return root;
  }
  return null;
}

export async function publishIssuedFiles(sourceRoot, message) {
  const root = gitRoot();
  if (!root) return { pushed: false, error: "no git checkout" };
  try {
    for (const rel of FILES) {
      const from = join(sourceRoot, rel);
      if (!existsSync(from)) continue;
      copyFileSync(from, join(root, rel));
    }
    await exec("git", ["add", "--", ...FILES], { cwd: root });
    const diff = await exec("git", ["diff", "--cached", "--quiet"], { cwd: root }).then(
      () => false,
      (err) => err.code === 1,
    );
    if (!diff) return { pushed: true, skipped: true };
    await exec(
      "git",
      [
        "-c",
        "user.name=Fluff421",
        "-c",
        "user.email=fluff421@users.noreply.github.com",
        "commit",
        "-m",
        message || "chore(data): issue watched play",
      ],
      { cwd: root },
    );
    await exec("git", ["pull", "--rebase", "origin", "main"], { cwd: root });
    await exec("git", ["push", "origin", "main"], { cwd: root });
    return { pushed: true };
  } catch (err) {
    return { pushed: false, error: err instanceof Error ? err.message : "push failed" };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const message = process.argv.slice(2).join(" ") || "chore(data): issue watched play [skip ci]";
  const result = await publishIssuedFiles(process.cwd(), message);
  if (!result.pushed) {
    console.error(result.error || "not pushed");
    process.exit(1);
  }
  console.log(JSON.stringify(result));
}
