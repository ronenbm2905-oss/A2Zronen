"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { env } from "@/config/env";
import { isAppError } from "@/lib/errors";
import { toHebrewMessage } from "@/lib/errors/messages.he";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

/**
 * The failure counterpart to `<EmptyState>`.
 *
 * Users see the Hebrew copy mapped from `AppError.code`; the raw message is
 * shown only in development, where it is the difference between "something went
 * wrong" and "you are missing a composite index, here is the URL to create it".
 * In production it would only leak internals.
 */
export function ErrorState({
  error,
  onRetry,
  title = "משהו השתבש",
  className,
}: ErrorStateProps) {
  const message = toHebrewMessage(error);
  const technical = readTechnicalMessage(error);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive-subtle px-6 py-block text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden />
      </span>

      <div className="space-y-1">
        <p className="font-heading text-base">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>

      {env.isDevelopment && technical ? (
        <pre className="max-w-full overflow-x-auto rounded-md bg-background/60 p-3 text-start text-xs text-muted-foreground" dir="ltr">
          {technical}
        </pre>
      ) : null}

      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          נסה שוב
        </Button>
      ) : null}
    </div>
  );
}

function readTechnicalMessage(error: unknown): string | null {
  if (isAppError(error)) return `${error.code}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return null;
}
