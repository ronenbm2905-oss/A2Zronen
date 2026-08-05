"use client";

import type { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  /** Rendered before the label in both the trigger and the list. */
  icon?: ReactNode;
}

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * The app's only Base UI `Select` call site.
 *
 * Wrapping it once matters for two reasons. Base UI's API differs from the Radix
 * one most shadcn code assumes — `onValueChange` receives `(value, details)`,
 * and the trigger's label comes from the root's `items` map rather than from the
 * selected `SelectItem`'s children. And a single wrapper means the RTL
 * behaviour, invalid styling and full-width sizing are decided once instead of
 * at a dozen call sites.
 */
export function SelectField({
  value,
  onChange,
  options,
  placeholder = "בחר…",
  id,
  className,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: SelectFieldProps) {
  // Base UI resolves the trigger's displayed label through this map, so it does
  // not have to reach into the popup's children to render a closed select.
  const items = Object.fromEntries(
    options.map((option) => [option.value, option.label]),
  );

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => onChange(String(next ?? ""))}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn("w-full", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.icon}
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
