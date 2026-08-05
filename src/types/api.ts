import type { ErrorCode } from "@/lib/errors";

/**
 * The API response envelope.
 *
 * Every endpoint in this system returns this shape — never a bare payload.
 * `success` is the discriminant, so clients can narrow with a single check:
 *
 * ```ts
 * if (res.success) res.data else res.error.code
 * ```
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  /** Optional structured context, e.g. per-field validation issues. */
  details?: unknown;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Query shape for list endpoints. Consumed by services in later phases. */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
