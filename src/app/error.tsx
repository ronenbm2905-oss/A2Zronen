"use client";

import { useEffect } from "react";

import { logger } from "@/lib/logger";

/**
 * Route-level error boundary. Catches render/data errors below the root layout.
 * Intentionally unstyled beyond basic layout — product design comes later.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Unhandled route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-lg font-medium">Something went wrong</h1>
      {error.digest ? (
        <p className="text-muted-foreground text-sm">Reference: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="border-input hover:bg-accent rounded-md border px-4 py-2 text-sm"
      >
        Try again
      </button>
    </main>
  );
}
