import { cn } from "@/lib/utils";

export interface BreakdownSegment {
  key: string;
  label: string;
  value: number;
  /** A background utility class, e.g. `bg-chart-1`. */
  className: string;
}

interface BreakdownBarProps {
  segments: BreakdownSegment[];
  emptyLabel?: string;
}

/**
 * A stacked proportion bar plus a legend — the dashboard's status and priority
 * breakdowns.
 *
 * Built with flex and percentage widths rather than absolute positioning, so it
 * fills from the inline-start edge and therefore reads right-to-left under
 * `dir="rtl"` without any mirroring logic.
 */
export function BreakdownBar({
  segments,
  emptyLabel = "אין נתונים להצגה",
}: BreakdownBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const visible = segments.filter((segment) => segment.value > 0);

  return (
    <div className="space-y-3">
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-pill bg-muted"
        role="img"
        aria-label={visible
          .map((segment) => `${segment.label}: ${segment.value}`)
          .join(", ")}
      >
        {visible.map((segment) => (
          <span
            key={segment.key}
            className={cn("h-full", segment.className)}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
      </div>

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {segments.map((segment) => (
          <li
            key={segment.key}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span
              aria-hidden
              className={cn("size-2.5 shrink-0 rounded-full", segment.className)}
            />
            <span className="flex-1 truncate">{segment.label}</span>
            <span className="font-medium tabular-nums text-foreground">
              {segment.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
