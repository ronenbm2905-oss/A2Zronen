/**
 * The palette users may pick from when creating a project or a tag.
 *
 * A closed token union rather than a free-form hex string: every value maps to
 * a variable that already exists in `globals.css`, so user-generated content
 * cannot fall outside the design system or break in dark mode.
 *
 * The Tailwind class maps live in `@/constants/color`.
 */
export const COLOR_TOKENS = [
  "sky",
  "blue",
  "navy",
  "slate",
  "rose",
  "yellow",
  "success",
  "warning",
  "info",
  "destructive",
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

export const DEFAULT_COLOR_TOKEN: ColorToken = "sky";
