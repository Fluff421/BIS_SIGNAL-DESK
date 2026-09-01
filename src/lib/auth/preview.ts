/**
 * Shared live-preview client constants for the Grok auth broker.
 * Deployed apps get per-app GROK_AUTH_* from the deployer; sandbox previews
 * fall back to this shared client which the broker accepts for any
 * `*.grok-sandbox.com` callback.
 */

export const GROK_ISSUER_DEFAULT = "https://auth.grok.me";

/** Hosts the dynamic baseURL allowlist trusts in live preview. */
export const PREVIEW_ALLOWED_HOSTS = [
  "*.grok-sandbox.com",
  "*.preview.grok.me",
] as const;

/** Shared preview OAuth client id (public). */
export const PREVIEW_CLIENT_ID = "grok-preview-client";

/** Shared preview OAuth client secret (sandbox only — not for production). */
export const PREVIEW_CLIENT_SECRET = "grok-preview-secret";
