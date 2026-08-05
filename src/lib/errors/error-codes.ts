/**
 * The closed set of error codes the API can return.
 *
 * Codes are part of the public API contract — clients branch on them, so treat
 * renames as breaking changes. Each code maps to exactly one HTTP status.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  /** A required environment variable or integration is missing/misconfigured. */
  CONFIG_ERROR: "CONFIG_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  CONFIG_ERROR: 500,
  INTERNAL_ERROR: 500,
};

/** Human-readable fallback used when no explicit message is supplied. */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "The request payload is invalid.",
  UNAUTHORIZED: "Authentication is required.",
  FORBIDDEN: "You do not have access to this resource.",
  NOT_FOUND: "The requested resource was not found.",
  CONFLICT: "The request conflicts with the current state.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  CONFIG_ERROR: "The server is not configured correctly.",
  INTERNAL_ERROR: "An unexpected error occurred.",
};
