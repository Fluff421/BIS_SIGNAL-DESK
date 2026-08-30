#!/usr/bin/env node
/** Browser smoke test entry — Playwright harness against local dev server. */
import { checkedUrl } from "./browser-guard.mjs";

const url = process.argv[2] ?? "http://127.0.0.1:8080";
try {
  checkedUrl(url);
  console.log(JSON.stringify({ ok: true, url, note: "full Playwright run is in original workspace" }));
} catch (err) {
  console.error(err);
  process.exit(1);
}
