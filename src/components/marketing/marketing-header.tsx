"use client";

import Link from "next/link";

import { ButtonLink } from "@/components/common";
import { useAuth } from "@/hooks";

/**
 * Public header.
 *
 * The call to action follows the session: a signed-in visitor who lands on the
 * marketing page wants their dashboard, not a sign-up form.
 */
export function MarketingHeader() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-heading text-lg text-gradient-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          A2Z Tasks
        </Link>

        <div className="ms-auto flex items-center gap-2">
          {isAuthenticated ? (
            <ButtonLink variant="strong" size="sm" href="/dashboard">
              ללוח הבקרה
            </ButtonLink>
          ) : (
            <>
              <ButtonLink variant="ghost" size="sm" href="/login">
                התחברות
              </ButtonLink>
              <ButtonLink variant="strong" size="sm" href="/register">
                הרשמה
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
