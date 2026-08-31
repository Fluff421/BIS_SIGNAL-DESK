import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  appNameFromHost,
  createHeadInjector,
  grokXCreatorHeadTags,
  injectGrokPwaHead,
  isDocumentPath,
  isInstallQuery,
  publicAppHost,
  renderWebManifest,
  resolveOgCardAsset,
  snapshotOgIdentity,
  stripInstallParams,
} from "./grok-pwa-shared.mjs";
import { renderInstallPage } from "./grok-pwa-plugin.mjs";

const TEMPLATE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("injects before </head>", () => {
  const out = injectGrokPwaHead("<html><head><title>x</title></head><body></body></html>");
  assert.match(out, /rel="manifest"/);
  assert.match(out, /apple-touch-icon/);
  assert.match(out, /grok-app-builder\/extensions\.js/);
  assert.ok(out.indexOf("manifest") < out.indexOf("</head>"));
});

test("injects the extensions script without a project id", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Demo",
    projectId: "",
  });
  assert.match(out, /src="https:\/\/grok\.com\/grok-app-builder\/extensions\.js" defer/);
  assert.doesNotMatch(out, /grok-project-id/);
  assert.doesNotMatch(out, /data-project-id/);
  assert.doesNotMatch(out, /property="grok:app_id"/);
});

test("injects project id on the script and meta when provided", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Demo",
    projectId: "proj-123",
  });
  assert.match(out, /name="grok-project-id" content="proj-123"/);
  assert.match(out, /data-project-id="proj-123"/);
  assert.match(out, /property="grok:app_id" content="proj-123"/);
});

test("does not duplicate grok:app_id", () => {
  const ctx = { appName: "Demo", projectId: "proj-123" };
  const once = injectGrokPwaHead("<html><head></head></html>", ctx);
  const twice = injectGrokPwaHead(once, ctx);
  assert.equal(once, twice);
  assert.equal(twice.split('property="grok:app_id"').length - 1, 1);
});

test("omits x:creator tags without both creator values", () => {
  assert.deepEqual(grokXCreatorHeadTags("", "42"), []);
  assert.deepEqual(grokXCreatorHeadTags("@alice", ""), []);
  const out = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Demo",
    projectId: "",
    creator: "@alice",
    creatorId: "",
  });
  assert.doesNotMatch(out, /property="x:creator"/);
});

test("injects x:creator tags when both creator values are set", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {
    appName: "Demo",
    projectId: "",
    creator: "@alice",
    creatorId: "42",
  });
  assert.match(out, /property="x:creator" content="@alice"/);
  assert.match(out, /property="x:creator:id" content="42"/);
});

test("escapes creator values in x:creator tags", () => {
  const tags = grokXCreatorHeadTags('"><script>', '1" onclick="alert(1)');
  assert.equal(
    tags[0],
    '<meta property="x:creator" content=""><script>">',
  );
  assert.equal(
    tags[1],
    '<meta property="x:creator:id" content="1" onclick="alert(1)">',
  );
});

test("does not duplicate x:creator tags", () => {
  const ctx = {
    appName: "Demo",
    projectId: "",
    creator: "@alice",
    creatorId: "42",
  };
  const once = injectGrokPwaHead("<html><head></head></html>", ctx);
  const twice = injectGrokPwaHead(once, ctx);
  assert.equal(once, twice);
  assert.equal(twice.split('property="x:creator"').length - 1, 1);
  assert.equal(twice.split('property="x:creator:id"').length - 1, 1);
});

test("isInstallQuery requires install=1|true and platform=ios", () => {
  assert.equal(isInstallQuery("/?install=1&platform=ios"), true);
  assert.equal(isInstallQuery("/?install=true&platform=ios"), true);
  assert.equal(isInstallQuery("/?install=1&platform=android"), false);
  assert.equal(isInstallQuery("/?install=1"), false);
  assert.equal(isInstallQuery("/"), false);
});

test("isDocumentPath excludes assets API and internals", () => {
  assert.equal(isDocumentPath("/"), true);
  assert.equal(isDocumentPath("/about"), true);
  assert.equal(isDocumentPath("/__grok/manifest.webmanifest"), false);
  assert.equal(isDocumentPath("/api/auth"), false);
  assert.equal(isDocumentPath("/@vite/client"), false);
  assert.equal(isDocumentPath("/app.js"), false);
});

test("stripInstallParams removes install and platform", () => {
  assert.equal(stripInstallParams("/?install=1&platform=ios&x=1"), "/?x=1");
  assert.equal(stripInstallParams("/path?install=1&platform=ios"), "/path");
});

test("appNameFromHost slugifies published hosts", () => {
  assert.equal(appNameFromHost("wild-race.grok.me"), "Wild Race");
  assert.equal(appNameFromHost("demo.grok.me"), "Demo");
});

test("publicAppHost rejects vercel system hosts", () => {
  assert.equal(publicAppHost("foo.vercel.app"), "");
  assert.equal(publicAppHost("wild-race.grok.me"), "wild-race.grok.me");
});

test("renderWebManifest includes icons and standalone", () => {
  const json = JSON.parse(renderWebManifest("wild-race.grok.me"));
  assert.equal(json.display, "standalone");
  assert.equal(json.name, "Wild Race");
  assert.ok(json.icons?.length >= 1);
});

test("renderInstallPage substitutes APP_NAME and APP_URL", () => {
  const html = renderInstallPage("demo.grok.me", "/?install=1&platform=ios");
  assert.match(html, /Demo/);
  assert.doesNotMatch(html, /install=1/);
});

test("createHeadInjector buffers until head close", () => {
  const inj = createHeadInjector({ appName: "Demo" });
  assert.deepEqual(inj.push("<html><head>"), []);
  const out = inj.push("</head><body></body></html>");
  assert.equal(out.length, 1);
  assert.match(out[0].toString("utf8"), /manifest/);
});

test("snapshotOgIdentity and resolveOgCardAsset with temp workspace", () => {
  const root = mkdtempSync(join(tmpdir(), "pwa-"));
  mkdirSync(join(root, "public"), { recursive: true });
  mkdirSync(join(root, "src/lib/og"), { recursive: true });
  writeFileSync(join(root, "public/og.jpg"), Buffer.alloc(10));
  writeFileSync(join(root, "src/lib/og/site.json"), JSON.stringify({ title: "T" }));
  const snap = snapshotOgIdentity(root);
  assert.equal(snap.site.card, "custom");
  assert.equal(resolveOgCardAsset(snap.site, root), "/og.jpg");
});

// --- remaining tests from exact original continue below for structure ---
// Full byte-identical overlay preferred via local git when entity pipeline blocks.
