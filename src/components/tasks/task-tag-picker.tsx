"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { COLOR_CHIP_CLASSES } from "@/constants";
import { cn } from "@/lib/utils";
import type { ID, Tag } from "@/types";

interface TaskTagPickerProps {
  tags: Tag[];
  selected: ID[];
  onToggle: (tagId: ID) => void;
  id?: string;
}

/**
 * Multi-select over the user's tags, rendered as toggleable chips.
 *
 * Chips rather than a combobox: a personal task manager has on the order of ten
 * tags, so showing all of them costs nothing and removes a click plus a search
 * interaction. If a user ever accumulates enough tags for this to wrap badly,
 * a searchable popover is the upgrade.
 */
export function TaskTagPicker({
  tags,
  selected,
  onToggle,
  id,
}: TaskTagPickerProps) {
  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        עדיין אין תגיות.{" "}
        <Link href="/tags" className="text-primary-strong underline underline-offset-4">
          יצירת תגית ראשונה
        </Link>
      </p>
    );
  }

  return (
    <div id={id} className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isSelected = selected.includes(tag.id);

        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(tag.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-4xl border px-2.5 py-1 text-xs transition-all",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isSelected
                ? COLOR_CHIP_CLASSES[tag.color]
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {isSelected ? <Check className="size-3" aria-hidden /> : null}
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
