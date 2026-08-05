"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/**
 * Route-level error boundary. Catches render and data errors below the root
 * layout.
 *
 * The prop is `retry`, not `reset` — Next.js 16.3 made `retry` stable, and the
 * two are not interchangeable. `retry()` re-runs the failed render *and*
 * re-fetches its data; `reset()` only clears the error state, which for a data
 * failure would re-render the same broken view and look like a dead button.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    logger.error("Unhandled route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive-subtle text-destructive">
        <AlertTriangle className="size-7" aria-hidden />
      </span>

      <div className="space-y-1">
        <h1 className="text-xl leading-heading">משהו השתבש</h1>
        <p className="text-sm text-muted-foreground">
          אירעה שגיאה בלתי צפויה. אפשר לנסות שוב.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground" dir="ltr">
            מזהה תקלה: {error.digest}
          </p>
        ) : null}
      </div>

      <Button variant="outline" onClick={() => retry()}>
        נסה שוב
      </Button>
    </main>
  );
}
