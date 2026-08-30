import { authClient, authEnabled } from "./client";

export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  isDevFallback: boolean;
};

export const DEV_USER: AppUser = {
  id: "dev-user",
  displayName: "Dev User",
  primaryEmail: "dev@example.com",
  profileImageUrl: null,
  isDevFallback: true,
};

export type CurrentUserState = {
  user: AppUser | null;
  isPending: boolean;
};

export function useCurrentUserState(): CurrentUserState {
  if (!authEnabled) return { user: DEV_USER, isPending: false };
  const session = authClient.useSession();
  if (session.isPending) return { user: null, isPending: true };
  const s = session.data;
  if (!s?.user) return { user: null, isPending: false };
  return {
    user: {
      id: s.user.id,
      displayName: s.user.name ?? null,
      primaryEmail: s.user.email ?? null,
      profileImageUrl: s.user.image ?? null,
      isDevFallback: false,
    },
    isPending: false,
  };
}

export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
