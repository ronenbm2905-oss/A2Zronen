"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/hooks";

/**
 * The mirror of `AuthGate`: keeps a signed-in user off the auth screens.
 *
 * Without it, a logged-in user landing on `/login` sees a form that would sign
 * them in as themselves — confusing, and it discards the session they already
 * have.
 *
 * **This component calls `useSearchParams`, so every ancestor route must wrap it
 * in `<Suspense>`.** Without that boundary the production build fails during the
 * static prerender pass — a late, confusing error, which is why the boundary
 * ships in `(auth)/layout.tsx` alongside the component itself.
 */
export function GuestGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status !== "authenticated") return;

    const next = searchParams.get("next");
    // Only same-origin paths: an attacker-supplied `?next=https://evil.example`
    // would otherwise turn the login screen into an open redirect.
    const destination = next?.startsWith("/") ? next : "/dashboard";

    router.replace(destination);
  }, [router, searchParams, status]);

  // Unconfigured still renders the form, which shows its own disabled state and
  // explains what is missing — more useful than a blank screen.
  if (status === "authenticated") return null;

  return <>{children}</>;
}
