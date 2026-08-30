#!/usr/bin/env node
import { isMainModule, mergeAppEnv, projectRoot, readAppEnv } from "./with-app-env.mjs";

const DEFAULT_DEV_URL = "http://127.0.0.1:8080";

export function authEnabledFromEnvValue(value) {
  return value !== "false";
}

export function compareAuthInvariant({ devAuthEnabled, buildAuthEnabled }) {
  const label = (value) => (value ? "on" : "off");
  if (devAuthEnabled === null || devAuthEnabled === undefined) {
    return {
      status: "indeterminate",
      message:
        "[auth-invariant] could not read the dev server's resolved VITE_AUTH_ENABLED",
    };
  }
  if (devAuthEnabled === buildAuthEnabled) {
    return {
      status: "ok",
      message: `[auth-invariant] dev and build agree: sign-in ${label(devAuthEnabled)}`,
    };
  }
  return {
    status: "diverged",
    message:
      `[auth-invariant] dev server has sign-in ${label(devAuthEnabled)} but the next ` +
      `build has it ${label(buildAuthEnabled)}. Start the app with \`npm run dev\` — ` +
      "invoking vite directly skips scripts/with-app-env.mjs.",
  };
}

export async function probeDevAuthEnabled(devUrl, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(new URL("/__app-env", devUrl).href);
    if (!res.ok) return null;
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }
    if (!parsed || typeof parsed.VITE_AUTH_ENABLED !== "string") return null;
    return authEnabledFromEnvValue(parsed.VITE_AUTH_ENABLED);
  } catch {
    return null;
  }
}

export function authInvariantWarnings(result) {
  return result.status === "diverged" ? [result.message] : [];
}

export function buildAuthEnabled(root = projectRoot(), processEnv = process.env) {
  const merged = mergeAppEnv(readAppEnv(root), processEnv);
  return authEnabledFromEnvValue(merged.VITE_AUTH_ENABLED ?? "false");
}

async function main(argv) {
  const devUrl =
    argv.find((a) => a.startsWith("--dev-url="))?.slice("--dev-url=".length) ||
    (argv.includes("--dev-url") ? argv[argv.indexOf("--dev-url") + 1] : DEFAULT_DEV_URL);
  const build = buildAuthEnabled();
  const dev = await probeDevAuthEnabled(devUrl);
  const result = compareAuthInvariant({ devAuthEnabled: dev, buildAuthEnabled: build });
  console.error(result.message);
  if (result.status === "ok") process.exit(0);
  if (result.status === "diverged") process.exit(1);
  process.exit(2);
}

if (isMainModule(import.meta.url)) {
  main(process.argv.slice(2));
}
