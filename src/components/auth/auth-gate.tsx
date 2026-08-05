"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { FirebaseNotConfigured } from "@/components/common";
import { useAuth } from "@/hooks";

/**
 * The single protection point for the entire `(app)` route group.
 *
 * Why the guard lives in the client and not in `src/proxy.ts`: the Firebase ID
 * token is held in IndexedDB, not a cookie, so the proxy has no auth signal to
 * read. Moving protection there would mean minting a session cookie and running
 * a parallel auth mechanism, since `onSnapshot` needs the ID token regardless.
 *
 * This gate is a UX affordance, not the security boundary. The real boundaries
 * are `requireUser()` on every route handler and `firestore.rules` on every
 * read — neither of which trusts anything the browser claims.
 *
 * The `unconfigured` branch deliberately does **not** redirect: with no Firebase
 * config, `/login` cannot work either, so redirecting would bounce the user
 * between two broken screens.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "unauthenticated") return;

    // `next` lets the login screen return the user where they were headed.
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [pathname, router, status]);

  if (status === "unconfigured") {
    return <FirebaseNotConfigured />;
  }

  // The same placeholder covers "checking the session" and "redirecting", since
  // from the user's point of view both are just a moment before the app appears.
  if (status === "loading" || status === "unauthenticated") {
    return <AuthGateFallback />;
  }

  return <>{children}</>;
}

function AuthGateFallback() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">טוען…</span>
      <span
        aria-hidden
        className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"
      />
    </div>
  );
}
