import { appConfig } from "@/config/app";
import { AppError, ERROR_CODES, type ErrorCode } from "@/lib/errors";
import type { ApiResponse } from "@/types";

/**
 * The browser's single door to `/api/v1`.
 *
 * Two things it guarantees, and everything above it depends on both:
 *
 * 1. **Every request carries a fresh bearer token.** The Firebase SDK caches the
 *    ID token and refreshes it automatically near expiry, so `getToken()` is
 *    cheap; the explicit force-refresh retry below covers the narrow window
 *    where a token expired in flight or the device clock has drifted.
 *
 * 2. **Every failure surfaces as `AppError`** — the same class the server threw.
 *    So the UI has one error type end to end: `error.code` drives the Hebrew
 *    copy in `messages.he.ts`, and `error.details` (Zod's `fieldErrors`) drives
 *    per-field form errors without either side hard-coding a field list.
 *
 * `getToken` is injected rather than imported so this module stays free of React
 * context and remains unit-testable. `useApiFetch()` binds it.
 */

export type GetToken = (forceRefresh?: boolean) => Promise<string>;

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

const NETWORK_ERROR_MESSAGE = "לא ניתן להתחבר לשרת. בדוק את החיבור לאינטרנט.";

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions,
  getToken: GetToken,
): Promise<T> {
  const { method = "GET", body, signal } = options;

  const call = async (token: string): Promise<Response> =>
    fetch(path, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        [appConfig.requestIdHeader]: crypto.randomUUID(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let response: Response;

  try {
    response = await call(await getToken());

    // One retry with a forced refresh. Retrying more would just replay a token
    // the server has already rejected on its merits.
    if (response.status === 401) {
      response = await call(await getToken(true));
    }
  } catch (error) {
    // `fetch` rejects only on a network-level failure; an HTTP error status
    // resolves normally. Re-throw an abort untouched so React Query can
    // recognise a cancelled request rather than reporting it as an outage.
    if (error instanceof DOMException && error.name === "AbortError") throw error;

    throw new AppError(ERROR_CODES.INTERNAL_ERROR, NETWORK_ERROR_MESSAGE, {
      cause: error,
    });
  }

  const payload = await readEnvelope<T>(response);

  if (!payload.success) {
    throw new AppError(payload.error.code, payload.error.message, {
      details: payload.error.details,
    });
  }

  return payload.data;
}

/**
 * Every route goes through `withApiHandler`, so a well-formed response is always
 * the envelope. A body that is not — a proxy error page, a 502 from the platform —
 * is normalised here rather than throwing an opaque `SyntaxError` at the caller.
 */
async function readEnvelope<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      error: {
        code: statusToErrorCode(response.status),
        message: `השרת החזיר תשובה לא צפויה (${response.status}).`,
      },
    };
  }
}

function statusToErrorCode(status: number): ErrorCode {
  if (status === 401) return ERROR_CODES.UNAUTHORIZED;
  if (status === 403) return ERROR_CODES.FORBIDDEN;
  if (status === 404) return ERROR_CODES.NOT_FOUND;
  if (status === 409) return ERROR_CODES.CONFLICT;
  if (status === 429) return ERROR_CODES.RATE_LIMITED;
  return ERROR_CODES.INTERNAL_ERROR;
}
