import type { NextRequest } from "next/server";
import { z } from "zod";

import { AppError } from "@/lib/errors";

/**
 * Zod → `AppError` adapters for route handlers.
 *
 * `AppError.validation` carries the flattened `fieldErrors` as `details`, which
 * `withApiHandler` puts on the wire and `apiFetch` rethrows client-side. That is
 * how a server-side validation failure ends up rendered under the right input
 * without either side hard-coding a field list.
 */

const INVALID_JSON_MESSAGE = "גוף הבקשה אינו JSON תקין.";
const INVALID_PAYLOAD_MESSAGE = "חלק מהפרטים שנשלחו אינם תקינים.";
const INVALID_QUERY_MESSAGE = "פרמטרי החיפוש אינם תקינים.";

function toValidationError(error: z.ZodError, message: string): AppError {
  return AppError.validation(message, z.flattenError(error).fieldErrors);
}

/**
 * Parse and validate a JSON request body.
 *
 * @throws {AppError} `VALIDATION_ERROR` for malformed JSON or a schema failure.
 */
export async function parseJsonBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    // The parser error is intentionally dropped: that the body is not JSON is
    // the whole diagnosis, and the underlying message leaks internals.
    throw AppError.validation(INVALID_JSON_MESSAGE);
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error, INVALID_PAYLOAD_MESSAGE);
  }

  return result.data;
}

/**
 * Parse and validate URL search params.
 *
 * Params arrive as a flat `string → string` map, which is why the filter schemas
 * accept comma-separated lists (`?status=todo,done`) rather than repeated keys.
 *
 * @throws {AppError} `VALIDATION_ERROR` on a schema failure.
 */
export function parseSearchParams<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): z.infer<T> {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error, INVALID_QUERY_MESSAGE);
  }

  return result.data;
}
