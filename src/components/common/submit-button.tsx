"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends ComponentProps<typeof Button> {
  isPending?: boolean;
  /** Replaces the label while the request is in flight. */
  pendingLabel?: string;
  children: ReactNode;
}

/**
 * A submit button that reports its own pending state.
 *
 * Disabling while pending is the point: every mutation in this app is
 * non-idempotent from the user's perspective, and a double-click on "create"
 * would otherwise produce two tasks.
 */
export function SubmitButton({
  isPending = false,
  pendingLabel,
  disabled,
  children,
  ...props
}: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={disabled || isPending} {...props}>
      {isPending ? (
        <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
      ) : null}
      {isPending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
