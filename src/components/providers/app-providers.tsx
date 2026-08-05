"use client";

import type { ReactNode } from "react";

/**
 * Composition root for client-side context providers.
 *
 * A pass-through today. Auth, theme, and query-client providers get nested here
 * in later phases so `layout.tsx` never has to change again.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
