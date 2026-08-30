import assert from "node:assert/strict";
import { test } from "node:test";
import {
  injectGrokPwaHead,
  isDocumentPath,
  isInstallQuery,
  resolveOgCardAsset,
  snapshotOgIdentity,
  stripInstallParams,
} from "./grok-pwa-shared.mjs";
import { renderInstallPage } from "./grok-pwa-plugin.mjs";

test("injects before </head>", () => {
  const out = injectGrokPwaHead("<html><head><title>x</title></head><body></body></html>");
  assert.match(out, /rel="manifest"/);
  assert.ok(out.indexOf("manifest") < out.indexOf("</head>"));
});

test("injects the extensions script without a project id", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Demo",
    projectId: "",
  });
  assert.match(out, /extensions\.js/);
});

test("injects project id when provided", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    projectId: "proj-123",
  });
  assert.match(out, /data-project-id="proj-123"/);
});

test("is idempotent", () => {
  const once = injectGrokPwaHead("<html><head></head></html>", { appName: "A" });
  const twice = injectGrokPwaHead(once, { appName: "A" });
  assert.equal(once, twice);
});

test("detects install query", () => {
  assert.equal(isInstallQuery("/?install=1"), true);
  assert.equal(isInstallQuery("/"), false);
});

test("filters non-document paths", () => {
  assert.equal(isDocumentPath("/"), true);
  assert.equal(isDocumentPath("/index.html"), true);
  assert.equal(isDocumentPath("/app.js"), false);
});

test("strips install params", () => {
  assert.equal(stripInstallParams("/?install=1&x=1"), "/?x=1");
});

test("renderInstallPage substitutes app name", () => {
  const html = renderInstallPage("demo.grok.me", "/");
  assert.match(html, /Demo|Grok App|demo/i);
});

test("resolveOgCardAsset returns empty when no card", () => {
  assert.equal(resolveOgCardAsset({}, "/tmp/nonexistent-ws-xyz"), "");
});

test("snapshotOgIdentity returns site object", () => {
  const snap = snapshotOgIdentity("/tmp/nonexistent-ws-xyz");
  assert.ok(snap && typeof snap === "object");
  assert.ok("site" in snap);
});
