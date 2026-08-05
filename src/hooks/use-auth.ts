"use client";

import { useContext } from "react";

import { AuthContext, type AuthContextValue } from "@/components/providers/auth-provider";
import { apiFetch, type ApiFetchOptions } from "@/lib/api-client";

/** Auth state and actions. Throws if used outside `AppProviders`. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within <AppProviders>.");
  }

  return context;
}

/**
 * `apiFetch` with the current user's token already bound.
 *
 * `getToken` is stable across renders (a `useCallback` with no dependencies that
 * reads through a ref), so the returned function is safe to use inside
 * `useMutation` and `useEffect` without churning their identities.
 */
export function useApiFetch() {
  const { getToken } = useAuth();

  return <T,>(path: string, options: ApiFetchOptions = {}): Promise<T> =>
    apiFetch<T>(path, options, getToken);
}
