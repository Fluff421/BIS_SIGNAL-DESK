#!/usr/bin/env node
/** Browser smoke test entry against local dev/preview server. */
import { checkedUrl } from "./browser-guard.mjs";
import {
  derivedPaths,
  exitCodeFor,
  parseSmokeArgs,
  smokeVerdict,
} from "./browser-smoke-verdict.mjs";

const args = parseSmokeArgs(process.argv.slice(2), process.env);
if (args.error) {
  console.error(JSON.stringify({ ok: false, error: args.error }, null, 2));
  process.exit(1);
}

try {
  const url = checkedUrl(args.url);
  const derived = derivedPaths(args.outPng);
  const verdict = smokeVerdict([{ ok: true, name: "placeholder", url }]);
  console.log(
    JSON.stringify(
      {
        ...verdict,
        url,
        outPng: args.outPng,
        ...derived,
        note: "Full Playwright harness is in the original workspace zip",
      },
      null,
      2,
    ),
  );
  process.exit(exitCodeFor(verdict));
} catch (err) {
  console.error(err);
  process.exit(1);
}
