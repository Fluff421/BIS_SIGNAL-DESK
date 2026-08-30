/**
 * Platform head chrome (PWA, extensions, OG) shared by Vite plugin and Nitro middleware.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_APP_NAME = "Grok App";
export const OG_SERVICE_URL_DEFAULT = "https://og.grok.me";
export const OG_SITE_REL_PATH = "src/lib/og/site.json";
export const GROK_EXTENSIONS_SCRIPT_SRC = "https://grok.com/grok-app-builder/extensions.js";

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function appNameFromHost(hostHeader) {
  const host = String(hostHeader ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  if (!host.endsWith(".grok.me")) return DEFAULT_APP_NAME;
  const slug = host.split(".")[0] ?? "";
  if (!slug || slug === "www" || !/^[a-z0-9-]{1,63}$/.test(slug)) return DEFAULT_APP_NAME;
  return (
    slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || DEFAULT_APP_NAME
  );
}

export function publicAppHost(hostHeader) {
  return String(hostHeader ?? "").split(",")[0].trim().split(":")[0].toLowerCase();
}

export function resolvePublicHost(hostHeader) {
  return publicAppHost(hostHeader);
}

export function isInstallQuery(url) {
  try {
    return new URL(url, "http://localhost").searchParams.get("install") === "1";
  } catch {
    return false;
  }
}

export function isDocumentPath(pathname) {
  return pathname === "/" || pathname.endsWith(".html") || !pathname.includes(".");
}

export function acceptsHtml(accept) {
  return !accept || String(accept).includes("text/html") || String(accept).includes("*/*");
}

export function stripInstallParams(url) {
  try {
    const u = new URL(url, "http://localhost");
    u.searchParams.delete("install");
    return u.pathname + (u.search || "");
  } catch {
    return url;
  }
}

export function renderInstallPageHtml(template, { host, url } = {}) {
  return String(template)
    .replaceAll("{{APP_NAME}}", escapeHtml(appNameFromHost(host)))
    .replaceAll("{{URL}}", escapeHtml(url ?? "/"));
}

export function renderWebManifest(hostHeader) {
  const name = appNameFromHost(hostHeader);
  return JSON.stringify({
    name,
    short_name: name,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
  });
}

export function grokPwaHeadTags(appName = DEFAULT_APP_NAME) {
  const n = escapeHtml(appName);
  return [
    `<meta name="application-name" content="${n}" />`,
    `<link rel="manifest" href="/manifest.webmanifest" />`,
  ].join("\n");
}

export function readGrokProjectId() {
  return process.env.GROK_PROJECT_ID?.trim() || "";
}

export function readXCreator() {
  return process.env.X_CREATOR?.trim() || "";
}

export function readXCreatorId() {
  return process.env.X_CREATOR_ID?.trim() || "";
}

export function grokXCreatorHeadTags(creator = readXCreator(), creatorId = readXCreatorId()) {
  const tags = [];
  if (creator) tags.push(`<meta name="twitter:creator" content="${escapeHtml(creator)}" />`);
  if (creatorId) tags.push(`<meta name="twitter:creator:id" content="${escapeHtml(creatorId)}" />`);
  return tags.join("\n");
}

export function grokExtensionsHeadTags(projectId = readGrokProjectId()) {
  if (!projectId) return "";
  return `<script src="${GROK_EXTENSIONS_SCRIPT_SRC}" data-project-id="${escapeHtml(projectId)}" defer></script>`;
}

export function readOgSite(cwd = process.cwd()) {
  try {
    return JSON.parse(readFileSync(join(cwd, OG_SITE_REL_PATH), "utf8"));
  } catch {
    return {};
  }
}

export function ogCardPublicPath(cwd = process.cwd()) {
  return existsSync(join(cwd, "public/og.jpg")) ? "/og.jpg" : "";
}

export function snapshotOgIdentity(cwd = process.cwd()) {
  return { site: readOgSite(cwd), card: ogCardPublicPath(cwd) };
}

export function customOgAssetPath(cwd = process.cwd()) {
  return join(cwd, "public/og.jpg");
}

export function ogServiceUrl() {
  return process.env.OG_SERVICE_URL?.trim() || OG_SERVICE_URL_DEFAULT;
}

export function titleFromDocument(html) {
  const m = String(html).match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : "";
}

export function resolveOgTitle(site = {}, html = "") {
  return site.title || titleFromDocument(html) || DEFAULT_APP_NAME;
}

export function siteHasCustomCard(site = {}) {
  return Boolean(site.image || site.card);
}

export function resolveOgCardAsset(site = {}, cwd = process.cwd()) {
  if (site.image) return site.image;
  return ogCardPublicPath(cwd);
}

export function grokOgHeadTags({ title, description, image, siteName } = {}) {
  const t = escapeHtml(title || DEFAULT_APP_NAME);
  const d = escapeHtml(description || "");
  const i = escapeHtml(image || "");
  const s = escapeHtml(siteName || t);
  const tags = [
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${s}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
  ];
  if (d) {
    tags.push(`<meta property="og:description" content="${d}" />`);
    tags.push(`<meta name="twitter:description" content="${d}" />`);
  }
  if (i) {
    tags.push(`<meta property="og:image" content="${i}" />`);
    tags.push(`<meta name="twitter:image" content="${i}" />`);
  }
  return tags.join("\n");
}

export function stripShareMetaTags(html) {
  return String(html);
}

export function normalizeHeadContext(ctx = {}) {
  return { ...ctx, appName: ctx.appName || DEFAULT_APP_NAME };
}

export function injectGrokPwaHead(html, ctx = {}) {
  const c = normalizeHeadContext(ctx);
  const inject = [
    grokPwaHeadTags(c.appName),
    grokExtensionsHeadTags(c.projectId),
    grokXCreatorHeadTags(c.creator, c.creatorId),
  ]
    .filter(Boolean)
    .join("\n");
  if (!inject) return html;
  if (String(html).includes("</head>")) {
    return String(html).replace("</head>", `${inject}\n</head>`);
  }
  return `${inject}\n${html}`;
}

export function createHeadInjector(ctx = {}) {
  return (html) => injectGrokPwaHead(html, ctx);
}
