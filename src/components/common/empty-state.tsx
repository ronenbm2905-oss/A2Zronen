import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** The action that resolves the emptiness — usually "create the first one". */
  action?: ReactNode;
  className?: string;
}

/**
 * Shown whenever a list has loaded successfully and holds nothing.
 *
 * Distinct from `<LoadingState>` and `<ErrorState>` on purpose: "no tasks yet"
 * and "we could not load your tasks" are opposite messages, and collapsing them
 * into one blank area is how users end up thinking their data vanished.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-block text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </span>

      <div className="space-y-1">
        <p className="font-heading text-base">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
