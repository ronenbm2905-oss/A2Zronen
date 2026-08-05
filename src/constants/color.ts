import { COLOR_TOKENS, type ColorToken } from "@/types";

/**
 * Every color token maps to classes built from variables that already exist in
 * `globals.css`. Class strings are written out in full rather than interpolated
 * (`bg-${token}`) because Tailwind scans source text statically — a constructed
 * class name is never emitted.
 */

export const COLOR_LABELS: Record<ColorToken, string> = {
  sky: "תכלת",
  blue: "כחול",
  navy: "כחול כהה",
  slate: "אפור",
  rose: "ורוד",
  yellow: "צהוב",
  success: "ירוק",
  warning: "כתום",
  info: "כחול בהיר",
  destructive: "אדום",
};

/** Solid fill — used for the small dot next to a project or tag name. */
export const COLOR_DOT_CLASSES: Record<ColorToken, string> = {
  sky: "bg-brand-sky-500",
  blue: "bg-brand-blue",
  navy: "bg-brand-navy",
  slate: "bg-brand-slate",
  rose: "bg-brand-rose",
  yellow: "bg-brand-yellow",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
};

/**
 * Tinted surface + readable text — used for tag chips and project badges.
 *
 * Fills are opacity-derived from the token itself rather than hand-picked light
 * shades, so a chip keeps the same relationship to whatever `--background` is.
 * `sky` leans on `--primary-strong` and the four state families on their
 * `-subtle` surfaces because those are the tokens that already flip in dark mode.
 */
export const COLOR_CHIP_CLASSES: Record<ColorToken, string> = {
  sky: "bg-primary/10 text-primary-strong border-primary/25",
  blue: "bg-brand-blue/10 text-brand-blue border-brand-blue/25",
  navy: "bg-brand-navy/10 text-brand-navy border-brand-navy/25",
  slate: "bg-brand-slate/10 text-brand-slate border-brand-slate/25",
  rose: "bg-brand-rose/10 text-brand-rose border-brand-rose/25",
  yellow: "bg-brand-yellow/25 text-brand-navy border-brand-yellow/40",
  success: "bg-success-subtle text-success border-success/25",
  warning: "bg-warning-subtle text-warning border-warning/25",
  info: "bg-info-subtle text-info border-info/25",
  destructive: "bg-destructive-subtle text-destructive border-destructive/25",
};

export { COLOR_TOKENS };
