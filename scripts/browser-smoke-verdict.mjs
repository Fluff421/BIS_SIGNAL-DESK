#!/usr/bin/env node
/** Summarize browser smoke results into a pass/fail verdict. */
export function smokeVerdict(results = []) {
  const failed = results.filter((r) => !r.ok);
  return {
    ok: failed.length === 0,
    failed: failed.length,
    total: results.length,
    failures: failed,
  };
}

export function formatVerdict(verdict) {
  if (verdict.ok) return `PASS ${verdict.total}/${verdict.total}`;
  return `FAIL ${verdict.failed}/${verdict.total}`;
}

if (process.argv[1]?.endsWith("browser-smoke-verdict.mjs")) {
  console.log(JSON.stringify(smokeVerdict([])));
}
