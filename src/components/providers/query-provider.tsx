"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { makeQueryClient } from "@/lib/query/client";

/**
 * `useState(makeQueryClient)` rather than a module-level singleton.
 *
 * A module singleton is shared across every request on the server, which in a
 * multi-tenant app means one user's cached rows could be served into another
 * user's initial render. Creating it inside the component scopes it to the
 * mount — and the lazy initializer keeps it stable across re-renders, which a
 * plain `new QueryClient()` in the body would not.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
