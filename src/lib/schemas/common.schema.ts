import { z } from "zod";

import { COLOR_TOKENS } from "@/types";

/**
 * Shared Zod building blocks.
 *
 * Everything under `@/lib/schemas` must stay importable from both a client
 * component and a route handler: pure Zod, no `server-only`, no Firebase, no
 * React. That is what lets a form and its API endpoint validate against the
 * exact same rules instead of two drifting copies.
 *
 * **Helpers here never carry `.default()` or `.optional()`.** Each entity
 * derives two schemas from one default-free shape: a create schema that adds
 * defaults, and `.partial()` for update. Baking a default into the shared shape
 * would leak it into the update schema, where `.partial()` does *not* strip it —
 * a PATCH touching only `status` would then also reset `tagIds` to `[]`, and the
 * "no fields sent" guard would never fire because defaults keep the object
 * non-empty. See `task.schema.ts` for the shape.
 */

export const idSchema = z.string().trim().min(1).max(128);

export const colorTokenSchema = z.enum(COLOR_TOKENS);

/** A required, trimmed, non-blank string. */
export function requiredText(max: number, message = "שדה חובה") {
  return z.string().trim().min(1, message).max(max, `עד ${max} תווים`);
}

/** A trimmed free-text field. Callers add `.default("")` where absence is legal. */
export function limitedText(max: number) {
  return z.string().trim().max(max, `עד ${max} תווים`);
}

/** An ISO instant or explicit absence. */
export const nullableIsoDate = z.iso.datetime().nullable();

/**
 * Comma-separated repeated values in a URL (`?status=todo,done`).
 * Returns `[]` for a missing or empty param so callers never branch on undefined.
 */
export function csvOf<T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .optional()
    .transform((raw) =>
      (raw ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(values)));
}

/** Same as {@link csvOf} but for free-form ids rather than a closed union. */
export const csvOfIds = z
  .string()
  .optional()
  .transform((raw) =>
    (raw ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  )
  .pipe(z.array(idSchema));
