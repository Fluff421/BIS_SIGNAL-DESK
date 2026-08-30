/**
 * Deployed-app (Nitro) half of the platform PWA chrome.
 * Auto-registered as global h3 middleware via serverDir: "./server".
 */
import {
  acceptsHtml,
  createHeadInjector,
  isDocumentPath,
  isInstallQuery,
  renderInstallPageHtml,
  renderWebManifest,
} from "../../scripts/grok-pwa-shared.mjs";

interface GrokPwaEvent {
  path: string;
  node: { req: { headers: Record<string, string | string[] | undefined> } };
}

function requestHost(event: GrokPwaEvent): string {
  const h = event.node.req.headers;
  const forwarded = h["x-forwarded-host"];
  const host = (Array.isArray(forwarded) ? forwarded[0] : forwarded) ?? h.host ?? "";
  return Array.isArray(host) ? host[0] : String(host);
}

export default defineEventHandler(async (event: GrokPwaEvent) => {
  const path = event.path || "/";
  const host = requestHost(event);

  if (path === "/__grok/manifest.webmanifest") {
    return new Response(renderWebManifest(host), {
      headers: { "content-type": "application/manifest+json" },
    });
  }

  if (isInstallQuery(path) && isDocumentPath(path.split("?")[0] || "/")) {
    const template =
      "<!DOCTYPE html><html><body><h1>Install {{APP_NAME}}</h1><a href=\"{{APP_URL}}\">Open</a></body></html>";
    const html = renderInstallPageHtml(template, { host, url: path });
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // HTML head injection is applied in the full original via streaming TransformStream.
  return undefined;
});
