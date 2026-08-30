/**
 * Dev/preview (Vite) half of the platform PWA chrome.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  acceptsHtml,
  createHeadInjector,
  isDocumentPath,
  isInstallQuery,
  renderInstallPageHtml,
  renderWebManifest,
  resolvePublicHost,
} from "./grok-pwa-shared.mjs";

export const GROK_OG_IDENTITY_ID = "virtual:grok-og-identity";

const INSTALL_PAGE_PATH = join(dirname(fileURLToPath(import.meta.url)), "install-page.html");

function requestHost(req) {
  const forwarded = req.headers["x-forwarded-host"];
  const host = forwarded ?? req.headers.host ?? req.headers[":authority"];
  return Array.isArray(host) ? host[0] : host;
}

export function renderInstallPage(hostHeader, url = "/") {
  let template = "<html><body><h1>{{APP_NAME}}</h1></body></html>";
  try {
    template = readFileSync(INSTALL_PAGE_PATH, "utf8");
  } catch {
    /* optional */
  }
  return renderInstallPageHtml(template, { host: hostHeader, url });
}

export function grokPwaPlugin() {
  return {
    name: "app-builder:grok-pwa",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        try {
          const rawUrl = req.url ?? "/";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "/";
          const host = requestHost(req);

          if (pathOnly === "/manifest.webmanifest") {
            const body = renderWebManifest(host);
            res.statusCode = 200;
            res.setHeader("content-type", "application/manifest+json");
            res.end(body);
            return;
          }

          if (isInstallQuery(rawUrl) && acceptsHtml(req.headers.accept)) {
            const html = renderInstallPage(host, rawUrl);
            res.statusCode = 200;
            res.setHeader("content-type", "text/html; charset=utf-8");
            res.end(html);
            return;
          }

          next();
        } catch {
          next();
        }
      });
    },
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return createHeadInjector({})(html);
      },
    },
  };
}
