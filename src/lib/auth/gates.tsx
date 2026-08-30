import type { ReactNode } from "react";
import { useCurrentUserState } from "./use-current-user";
import { authEnabled } from "./client";

export function RedirectToSignIn() {
  if (typeof window !== "undefined") {
    window.location.href = "/api/auth/signin";
  }
  return null;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  if (!authEnabled) return <>{children}</>;
  const { user, isPending } = useCurrentUserState();
  if (isPending) return null;
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}
