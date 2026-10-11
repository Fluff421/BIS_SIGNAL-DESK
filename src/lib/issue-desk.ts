import { execFile } from "node:child_process";
import { createServerFn } from "@tanstack/react-start";
import { promisify } from "node:util";

const exec = promisify(execFile);

type IssueInput = { event?: string; side?: string; note?: string };

async function runNode(args: string[]) {
  try {
    const { stdout } = await exec(process.execPath, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, BIS_GIT_ROOT: process.env.BIS_GIT_ROOT || "/tmp/bis-main" },
    });
    return { ok: true as const, stdout: stdout.trim() };
  } catch (err) {
    const error = err as { stderr?: string; message?: string };
    const text = String(error.stderr || error.message || "issue failed").trim();
    const line = text.split("\n").filter(Boolean).pop() || text;
    return { ok: false as const, error: line };
  }
}

/**
 * Issue one watched game from the desk. Writes the board and the open ledger,
 * then pushes those files when a git checkout is available.
 */
export const issueWatchedPlay = createServerFn({ method: "POST" })
  .inputValidator((input: IssueInput) => {
    const event = String(input?.event || "").trim();
    const side = String(input?.side || "").trim();
    const note = String(input?.note || "").trim();
    if (!event || !side || !note) {
      throw new Error("Pick a side and write a note before issuing.");
    }
    return { event, side, note };
  })
  .handler(async ({ data }) => {
    const issued = await runNode([
      "--experimental-strip-types",
      "scripts/issue-play.mjs",
      "--event",
      data.event,
      "--side",
      data.side,
      "--note",
      data.note,
    ]);
    if (!issued.ok) return { ok: false as const, error: issued.error };
    let payload: { event?: string; side?: string; team?: string; matchup?: string };
    try {
      payload = JSON.parse(issued.stdout);
    } catch {
      return { ok: false as const, error: "Issue succeeded but the result could not be read." };
    }
    const published = await runNode([
      "scripts/publish-issued.mjs",
      `chore(data): issue ${payload.event} ${payload.side} [skip ci]`,
    ]);
    return {
      ok: true as const,
      event: String(payload.event || data.event),
      side: String(payload.side || data.side),
      team: String(payload.team || ""),
      matchup: String(payload.matchup || ""),
      pushed: published.ok,
      pushError: published.ok ? null : published.error,
    };
  });
