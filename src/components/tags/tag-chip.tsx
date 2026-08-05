import { COLOR_CHIP_CLASSES } from "@/constants";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";

interface TagChipProps {
  tag: Tag;
  className?: string;
}

/** A tag rendered inline on a task. */
export function TagChip({ tag, className }: TagChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-4xl border px-2 text-xs",
        COLOR_CHIP_CLASSES[tag.color],
        className,
      )}
    >
      {tag.name}
    </span>
  );
}
