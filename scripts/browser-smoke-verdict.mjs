import { createHash } from "node:crypto";

export function normalizeBodyText(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizedBodyTextHash(text) {
  return createHash("sha256").update(normalizeBodyText(text)).digest("hex");
}

const IDENTITY_PREFIX_LEN = 64;

export function bodyTextPrefix(text) {
  return normalizeBodyText(text).slice(0, IDENTITY_PREFIX_LEN);
}

export function parseSmokeArgs(argv, env = {}) {
  const positional = [];
  let baseline = env.BROWSER_SMOKE_BASELINE || "";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--baseline") {
      const value = argv[++i];
      if (!value) return { error: "--baseline requires a path to a prior verdict JSON" };
      baseline = value;
    } else if (arg.startsWith("--baseline=")) {
      const value = arg.slice("--baseline=".length);
      if (!value) return { error: "--baseline requires a path to a prior verdict JSON" };
      baseline = value;
    } else if (arg.startsWith("--")) {
      return { error: `unknown flag: ${arg}` };
    } else {
      positional.push(arg);
    }
  }
  const url = positional[0] || env.BROWSER_SMOKE_URL || "http://127.0.0.1:8080";
  const outPng = positional[1] || env.BROWSER_SMOKE_OUT || "/tmp/smoke.png";
  return { url, outPng, baseline };
}

export function derivedPaths(outPng) {
  const base = String(outPng).replace(/\.png$/i, "");
  return {
    mobilePng: `${base}-mobile.png`,
    verdictJson: `${base}.verdict.json`,
  };
}

export function exitCodeFor(verdict) {
  if (!verdict?.ok) return 1;
  if (verdict.divergesFromBaseline) return 2;
  return 0;
}

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

export function baselineComparison(verdict, baselineText) {
  try {
    const baseline = JSON.parse(baselineText);
    const reasons = [];
    if (baseline.bodyTextHash && verdict.bodyTextHash && baseline.bodyTextHash !== verdict.bodyTextHash) {
      reasons.push("bodyTextHash changed");
    }
    return { divergesFromBaseline: reasons.length > 0, reasons };
  } catch {
    return { divergesFromBaseline: true, reasons: ["baseline unreadable: invalid JSON"] };
  }
}

if (process.argv[1]?.endsWith("browser-smoke-verdict.mjs")) {
  console.log(JSON.stringify(smokeVerdict([])));
}
