import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import type { ApiFailure, ApiSuccess } from "@/types";

interface ResponseInitOptions {
  status?: number;
  headers?: HeadersInit;
}

/** Wrap a payload in the success envelope. */
export function apiSuccess<T>(
  data: T,
  { status = 200, headers }: ResponseInitOptions = {},
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status, headers });
}

/**
 * Wrap an error in the failure envelope.
 *
 * The HTTP status comes from the error's code unless explicitly overridden, so
 * the status and the body code can never drift apart by accident.
 */
export function apiFailure(
  error: AppError,
  { status, headers }: ResponseInitOptions = {},
): NextResponse<ApiFailure> {
  return NextResponse.json<ApiFailure>(
    { success: false, error: error.toJSON() },
    { status: status ?? error.status, headers },
  );
}
