import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTone = "default" | "success" | "warning" | "destructive" | "info";

const TONE_CLASSES: Record<StatTone, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  destructive: "bg-destructive-subtle text-destructive",
  info: "bg-info-subtle text-info",
};

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: StatTone;
  hint?: string;
  /** Turns the whole card into a link to the matching filtered view. */
  href?: string;
}

/** One dashboard figure: a number, what it counts, and where to go see it. */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  href,
}: StatCardProps) {
  const content = (
    <Card
      size="sm"
      className={cn(
        "h-full transition-shadow",
        href && "hover:shadow-md focus-within:shadow-md",
      )}
    >
      <CardHeader className="flex-row items-center gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            TONE_CLASSES[tone],
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className="font-heading text-display-sm leading-none tabular-nums">
          {value}
        </p>
        {hint ? (
          <p className="pt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-none">
      {content}
    </Link>
  );
}
