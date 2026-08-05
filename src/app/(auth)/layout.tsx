import { Suspense, type ReactNode } from "react";

import { GuestGate } from "@/components/auth";

/**
 * Shell for the sign-in, sign-up and password-reset screens.
 *
 * The `<Suspense>` boundary is **required**, not stylistic: `GuestGate` and
 * `LoginForm` both call `useSearchParams`, and Next fails the production build
 * for a component that reads search params outside a suspense boundary. Shipping
 * it here, in the layout that owns every such screen, means no individual page
 * can forget it.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-surface px-4 py-block">
      <Suspense fallback={<AuthLayoutFallback />}>
        <GuestGate>{children}</GuestGate>
      </Suspense>
    </div>
  );
}

function AuthLayoutFallback() {
  return (
    <div className="flex min-h-64 items-center justify-center" aria-busy="true">
      <span className="sr-only">טוען…</span>
      <span
        aria-hidden
        className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"
      />
    </div>
  );
}
