import { NextResponse, type NextRequest } from "next/server";

import { appConfig } from "@/config/app";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { apiFailure, apiSuccess } from "./response";

/**
 * A route handler that returns the *payload* rather than a `Response`.
 * Returning a `NextResponse` directly is still allowed for streaming, redirects
 * and other cases where the envelope does not apply.
 */
export type ApiHandler<TContext = unknown> = (
  request: NextRequest,
  context: TContext,
) => Promise<unknown> | unknown;

/**
 * The single entry point for every API route in this system.
 *
 * It guarantees three things across the whole API surface:
 *
 * - responses always use the `ApiResponse` envelope;
 * - a thrown `AppError` maps to its declared HTTP status;
 * - anything else becomes a logged, generic 500 — internals never reach the client.
 *
 * ```ts
 * export const GET = withApiHandler(async () => ({ hello: "world" }));
 * ```
 */
export function withApiHandler<TContext = unknown>(handler: ApiHandler<TContext>) {
  return async (request: NextRequest, context: TContext): Promise<NextResponse> => {
    const requestId = request.headers.get(appConfig.requestIdHeader) ?? undefined;
    const headers = requestId ? { [appConfig.requestIdHeader]: requestId } : undefined;

    try {
      const result = await handler(request, context);

      // Let handlers opt out of the envelope when they build their own response.
      if (result instanceof NextResponse) return result;

      return apiSuccess(result, { headers });
    } catch (error) {
      const appError = AppError.from(error);

      const logMeta = {
        method: request.method,
        path: request.nextUrl.pathname,
        code: appError.code,
        requestId,
        cause: appError.cause,
      };

      if (appError.isOperational && appError.status < 500) {
        logger.warn(appError.message, logMeta);
      } else {
        logger.error(appError.message, logMeta);
      }

      return apiFailure(appError, { headers });
    }
  };
}
