import { useState, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { authEnabled, signOut } from "./client";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";

/** Where RedirectToSignIn sends signed-out visitors. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a user is present. */
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}

/** Render children only once we KNOW the visitor is signed out. */
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

/** Client-side redirect to the sign-in route. */
export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  return <Navigate to={to} />;
}

/** Minimal signed-in identity chip + sign-out. */
export function UserButton() {
  const user = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  return (
    <div className="flex items-center gap-2">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="size-8 rounded-full object-cover"
        />
      ) : null}
      <span className="text-sm">{label}</span>
      {authEnabled ? (
        <button
          type="button"
          disabled={signingOut}
          className="text-sm text-muted hover:text-fg disabled:opacity-50"
          onClick={async () => {
            setSigningOut(true);
            try {
              await signOut("/");
            } catch {
              setSigningOut(false);
            }
          }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      ) : null}
    </div>
  );
}

/** Require auth — redirect when signed out after session resolves. */
export function RequireAuth({ children }: { children: ReactNode }) {
  if (!authEnabled) return <>{children}</>;
  const { user, isPending } = useCurrentUserState();
  if (isPending) return null;
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}
