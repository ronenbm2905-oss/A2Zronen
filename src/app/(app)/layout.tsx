import type { ReactNode } from "react";

import { AuthGate } from "@/components/auth";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Shell for every signed-in screen.
 *
 * `AuthGate` sits outside `AppShell` so an unauthenticated visitor never sees a
 * flash of application chrome before being redirected — and so an unconfigured
 * install renders the setup notice on a clean page rather than inside a sidebar
 * whose data hooks cannot work.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
