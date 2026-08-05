"use client";

import { Check } from "lucide-react";

import { COLOR_DOT_CLASSES, COLOR_LABELS, COLOR_TOKENS } from "@/constants";
import { cn } from "@/lib/utils";
import type { ColorToken } from "@/types";

interface ColorPickerProps {
  value: ColorToken;
  onChange: (color: ColorToken) => void;
  id?: string;
  className?: string;
}

/**
 * Swatch picker over the closed `COLOR_TOKENS` set.
 *
 * A radio group rather than a colour input: constraining the choice to design
 * system tokens is what keeps user-created projects and tags legible in both
 * themes, which a free-form hex value cannot guarantee.
 */
export function ColorPicker({ value, onChange, id, className }: ColorPickerProps) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="בחירת צבע"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {COLOR_TOKENS.map((token) => {
        const isSelected = token === value;

        return (
          <button
            key={token}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={COLOR_LABELS[token]}
            title={COLOR_LABELS[token]}
            onClick={() => onChange(token)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-[box-shadow,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              COLOR_DOT_CLASSES[token],
              isSelected
                ? "ring-2 ring-foreground/60 ring-offset-2 ring-offset-background"
                : "hover:scale-110",
            )}
          >
            {isSelected ? (
              <Check className="size-4 text-white drop-shadow" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
