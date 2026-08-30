/**
 * Upstream identity providers via the auth broker.
 * Source of truth for server.ts and client.ts.
 */
export type GrokProvider = {
  providerId: string;
  idp: string;
  label: string;
};

export const GROK_PROVIDERS: readonly GrokProvider[] = [
  { providerId: "grok-google", idp: "google", label: "Google" },
  { providerId: "grok-x", idp: "twitter", label: "X" },
];

/** Alias used by some call sites */
export const AUTH_PROVIDERS = GROK_PROVIDERS;
