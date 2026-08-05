import { COLOR_DOT_CLASSES } from "@/constants";
import { cn } from "@/lib/utils";
import type { ColorToken } from "@/types";

interface ColorDotProps {
  color: ColorToken;
  className?: string;
}

/** The small solid swatch that identifies a project or tag in a list. */
export function ColorDot({ color, className }: ColorDotProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        COLOR_DOT_CLASSES[color],
        className,
      )}
    />
  );
}
