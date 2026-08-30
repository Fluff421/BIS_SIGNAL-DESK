/**
 * Dev/preview (Vite) half of the platform PWA chrome.
 * Full implementation uses grok-pwa-shared.mjs + install-page.html.
 */
export function grokPwaPlugin() {
  return {
    name: "app-builder:grok-pwa",
    apply: "serve",
    configureServer() {
      // Full PWA install page + manifest injection in original workspace.
    },
  };
}
