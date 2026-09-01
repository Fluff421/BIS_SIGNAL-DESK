/** Shared provider list — safe for client + server imports (no secrets). */

export type GrokProvider = {
  /** Better Auth provider id (and the value we store on account.providerId). */
  providerId: string;
  /** Human label for the sign-in button. */
  label: string;
  /** Broker `idp` hint — which upstream the broker should start. */
  idp: string;
};

/**
 * Upstream sign-in methods this app exposes. Each entry becomes one
 * `genericOAuth` provider that federates to the shared Grok auth broker with a
 * different `idp` hint. Add/remove here to change the buttons on the sign-in
 * page — the server plugin and the client button list both read this array.
 */
export const GROK_PROVIDERS: GrokProvider[] = [
  { providerId: "google", label: "Google", idp: "google" },
  { providerId: "x", label: "X", idp: "x" },
];
