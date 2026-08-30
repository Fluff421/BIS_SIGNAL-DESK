/** Upstream identity providers via the auth broker. */
export type AuthProviderEntry = {
  providerId: string;
  idp: string;
  label: string;
};

export const AUTH_PROVIDERS: AuthProviderEntry[] = [
  { providerId: "grok-google", idp: "google", label: "Google" },
  { providerId: "grok-x", idp: "twitter", label: "X" },
];
