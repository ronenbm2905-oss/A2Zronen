"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  EmailAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { isFirebaseConfigured } from "@/config/env";
import { endpoints } from "@/lib/api-client";
import { AppError } from "@/lib/errors";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { logger } from "@/lib/logger";
import type { AuthUser } from "@/types";

/**
 * Client-side authentication state.
 *
 * Three decisions shape this module:
 *
 * - **`onIdTokenChanged`, not `onAuthStateChanged`.** The former fires on sign
 *   in/out *and* on every hourly token refresh, which keeps `userRef` holding a
 *   user whose `getIdToken()` returns something currently valid.
 *
 * - **An explicit `"unconfigured"` status.** With a blank `.env.local`,
 *   `getFirebaseAuth()` throws. Detecting that up front lets the UI render an
 *   honest "not configured" screen instead of crashing, and — critically — lets
 *   `AuthGate` avoid redirecting to a `/login` that could not work either.
 *
 * - **Password change lives here, not behind the API.** Firebase requires
 *   `reauthenticateWithCredential` with the user's live credential, which exists
 *   only in the browser. This is the one deliberate exception to "all writes go
 *   through /api/v1"; it touches Firebase Auth, never Firestore.
 */

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "unconfigured";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Resolves an ID token, refreshing it when `forceRefresh` is set. */
  getToken: (forceRefresh?: boolean) => Promise<string>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Reflect a display-name change made through `PATCH /api/v1/me`. */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<AuthStatus>(
    isFirebaseConfigured ? "loading" : "unconfigured",
  );
  const [user, setUser] = useState<AuthUser | null>(null);

  // Held in a ref as well as state so `getToken` never closes over a stale user
  // and does not need to be re-created on every auth change.
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    // Not wrapped in a try/catch: `isFirebaseConfigured` already covers the
    // only expected failure (missing keys), and it decided the initial status
    // above. Anything else — a malformed key, say — is a real misconfiguration
    // that should reach the route error boundary rather than be flattened into
    // a generic "not configured" screen.
    const auth = getFirebaseAuth();

    // Survive a page reload. This resolves before the first sign-in attempt
    // because every entry point awaits the provider's own methods.
    void setPersistence(auth, browserLocalPersistence).catch((error: unknown) => {
      logger.warn("Could not set auth persistence", { error });
    });

    return onIdTokenChanged(
      auth,
      (nextUser) => {
        userRef.current = nextUser;
        setUser(nextUser ? toAuthUser(nextUser) : null);
        setStatus(nextUser ? "authenticated" : "unauthenticated");
      },
      (error) => {
        logger.error("Auth subscription failed", { error });
        setStatus("unauthenticated");
      },
    );
  }, []);

  const getToken = useCallback(async (forceRefresh = false): Promise<string> => {
    const current = userRef.current;
    if (!current) {
      throw AppError.unauthorized("נדרשת התחברות כדי לבצע פעולה זו.");
    }

    return current.getIdToken(forceRefresh);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const auth = getFirebaseAuth();
      await setPersistence(auth, browserLocalPersistence);

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName });

      // The token minted at sign-up predates `updateProfile`, so force a refresh
      // before bootstrap — otherwise the seeded profile records a null name.
      const token = await credential.user.getIdToken(true);

      // Seeds the profile mirror plus a starter project and tags. Idempotent, so
      // a failure here is recoverable and must not block the user from getting
      // into the app; the next call re-runs it.
      try {
        const response = await fetch(endpoints.bootstrap(), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          logger.warn("Bootstrap returned a non-OK status", {
            status: response.status,
          });
        }
      } catch (error) {
        logger.warn("Bootstrap request failed", { error });
      }

      setUser(toAuthUser(credential.user));
    },
    [],
  );

  const signOutUser = useCallback(async () => {
    await signOut(getFirebaseAuth());
    // Drop every cached tenant row so the next user in this tab starts empty.
    queryClient.clear();
  }, [queryClient]);

  const sendReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const current = userRef.current;
      if (!current?.email) {
        throw AppError.unauthorized("נדרשת התחברות כדי לשנות סיסמה.");
      }

      // Firebase rejects `updatePassword` on a session older than a few minutes,
      // so re-authenticating first is required rather than merely defensive.
      await reauthenticateWithCredential(
        current,
        EmailAuthProvider.credential(current.email, currentPassword),
      );
      await updatePassword(current, newPassword);
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    const current = userRef.current;
    if (!current) return;

    await current.reload();
    setUser(toAuthUser(current));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      getToken,
      signIn,
      signUp,
      signOutUser,
      sendReset,
      changePassword,
      refreshUser,
    }),
    [
      status,
      user,
      getToken,
      signIn,
      signUp,
      signOutUser,
      sendReset,
      changePassword,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
