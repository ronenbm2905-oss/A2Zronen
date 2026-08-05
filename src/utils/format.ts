/**
 * Pure, dependency-free helpers.
 *
 * The boundary with `@/lib`: anything here must be stateless and must not touch
 * the network, the environment, or any SDK. Infrastructure lives in `@/lib`.
 */

import type { ISODateString } from "@/types";

/** Normalize a date-ish value to the ISO 8601 wire format used across the API. */
export function toIsoString(value: Date | number | string = new Date()): ISODateString {
  return new Date(value).toISOString();
}

/** `true` for null, undefined, and whitespace-only strings. */
export function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}
