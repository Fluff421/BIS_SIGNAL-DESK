/**
 * Self-hosted Better Auth for THIS app (server-only).
 * Full implementation is in the original workspace zip.
 * This stub exports the surface expected by imports.
 */
export const auth = {
  handler: async (_req: Request) => new Response("auth handler stub", { status: 501 }),
  api: {},
};

export type Auth = typeof auth;
