import type { ReactNode } from "react";

/** Auth is currently disabled (see .grok/app-env.json). */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
