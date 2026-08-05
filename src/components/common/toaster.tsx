"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import { useToasts } from "@/hooks";
import { dismissToast, type ToastVariant } from "@/lib/toast";
import { cn } from "@/lib/utils";

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "border-success/25 bg-success-subtle text-success",
  error: "border-destructive/25 bg-destructive-subtle text-destructive",
  info: "border-info/25 bg-info-subtle text-info",
};

const VARIANT_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

/**
 * Renders the toast store. Mounted once, at the root of `AppProviders`.
 *
 * `aria-live="polite"` on the region rather than `role="alert"` on each toast:
 * these are confirmations of actions the user just took, so they should be
 * announced after whatever the screen reader is currently saying rather than
 * interrupting it.
 */
export function Toaster() {
  const toasts = useToasts();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:bottom-4 sm:start-4 sm:items-start"
    >
      {toasts.map((item) => {
        const Icon = VARIANT_ICONS[item.variant];

        return (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2",
              VARIANT_CLASSES[item.variant],
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="flex-1 text-sm text-foreground">{item.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label="סגירת ההודעה"
              className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
