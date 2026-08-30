import type { BetterAuthPlugin } from "better-auth";

export const GATE_PROVIDER_ID = "grok-gate";

/**
 * Better Auth plugin for gate identity sessions.
 * Full implementation is in the original workspace zip.
 */
export function gateIdentitySessions(): BetterAuthPlugin {
  return {
    id: "gate-identity-sessions",
    hooks: {
      after: [],
    },
  } as BetterAuthPlugin;
}
