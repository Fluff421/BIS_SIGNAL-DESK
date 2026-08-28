/**
 * Dev-only `/__app-env` endpoint: the client env the running Vite server
 * resolved, as JSON.
 *
 * `scripts/check-auth-invariant.mjs` reads it to compare the live dev server's
 * `VITE_AUTH_ENABLED` against the value the next build will resolve.
 */
export function appEnvPlugin() {
  return {
    name: "app-builder:app-env",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? "").split("?", 1)[0] !== "/__app-env") {
          next();
          return;
        }
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(
          JSON.stringify({
            VITE_AUTH_ENABLED: process.env.VITE_AUTH_ENABLED ?? "false",
          }),
        );
      });
    },
  };
}
