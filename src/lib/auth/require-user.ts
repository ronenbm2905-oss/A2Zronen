import "server-only";

import type { NextRequest } from "next/server";

import { AppError, ERROR_CODES, isAppError } from "@/lib/errors";
import { getAdminAuth } from "@/lib/firebase/admin";
import type { AuthUser } from "@/types";

const BEARER_PREFIX = "Bearer ";

const MISSING_TOKEN_MESSAGE = "נדרשת התחברות כדי לבצע פעולה זו.";
const INVALID_TOKEN_MESSAGE = "אסימון ההזדהות אינו תקף או שפג תוקפו.";

/**
 * Verify the caller's Firebase ID token. The first line of **every** protected
 * route handler.
 *
 * The returned `uid` is the only acceptable source of ownership in this system:
 * services take it as an argument and never read `userId` from a request body,
 * which is what makes tenant isolation a property of the code path rather than
 * of careful payload validation.
 *
 * @throws {AppError} `UNAUTHORIZED` when the header is missing, malformed, or
 * carries a token Firebase rejects; `CONFIG_ERROR` when the Admin SDK is not
 * configured.
 */
export async function requireUser(request: NextRequest): Promise<AuthUser> {
  const header = request.headers.get("authorization");

  if (!header?.startsWith(BEARER_PREFIX)) {
    throw AppError.unauthorized(MISSING_TOKEN_MESSAGE);
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    throw AppError.unauthorized(MISSING_TOKEN_MESSAGE);
  }

  try {
    // `checkRevoked: false` avoids an extra round-trip to the Auth backend on
    // every request. Flip it to `true` if immediate revocation-on-logout ever
    // becomes a requirement.
    const decoded = await getAdminAuth().verifyIdToken(token, false);

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      emailVerified: decoded.email_verified ?? false,
    };
  } catch (error) {
    // Load-bearing: `getAdminAuth()` throws `CONFIG_ERROR` when the service
    // account is missing. Without this re-throw, a setup problem would be
    // reported to the client as 401 Unauthorized and send whoever is debugging
    // it looking at the wrong layer entirely.
    if (isAppError(error)) throw error;

    throw new AppError(ERROR_CODES.UNAUTHORIZED, INVALID_TOKEN_MESSAGE, {
      cause: error,
    });
  }
}
