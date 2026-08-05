import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingVariant = "list" | "grid" | "stats" | "detail" | "form";

interface LoadingStateProps {
  variant?: LoadingVariant;
  /** Rows or cards to draw. Should roughly match the real content's density. */
  count?: number;
  className?: string;
  /** Screen-reader announcement; the skeleton itself is decorative. */
  label?: string;
}

/**
 * Skeletons shaped like the content they stand in for.
 *
 * Matching the real layout matters more than it looks: a skeleton with the wrong
 * dimensions makes the page jump when data lands, which reads as a bug rather
 * than as loading.
 */
export function LoadingState({
  variant = "list",
  count = 3,
  className,
  label = "טוען…",
}: LoadingStateProps) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {renderVariant(variant, count)}
    </div>
  );
}

function renderVariant(variant: LoadingVariant, count: number) {
  const items = Array.from({ length: count }, (_, index) => index);

  if (variant === "stats") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((index) => (
          <Card key={index} size="sm">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="space-y-4">
        {items.map((index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-3 rounded-xl border border-border bg-card p-4",
          )}
        >
          <Skeleton className="size-5 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
