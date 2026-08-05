"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common";
import { logger } from "@/lib/logger";

/**
 * Error boundary for the signed-in screens.
 *
 * The prop is `retry`, not `reset`: Next.js 16.3 made `retry` stable, and the
 * two differ in a way that matters here. `retry()` re-runs the failed render
 * *and* re-fetches; `reset()` only clears the error state, which for a data
 * failure would just re-render the same broken view.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    logger.error("Unhandled error in the app segment", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="py-block">
      <ErrorState
        error={error}
        onRetry={retry}
        title="לא הצלחנו לטעון את המסך"
      />
    </div>
  );
}
