import "server-only";

import { appConfig } from "@/config/app";
import { env } from "@/config/env";
import { serverEnv } from "@/config/server-env";
import { AppError, ERROR_CODES, type ErrorCode } from "@/lib/errors";
import { getAdminAuth } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";
import type { ApiResponse, ID } from "@/types";

/**
 * How the agent reaches the user's data: over HTTP, through `/api/v1`, holding a
 * real Firebase ID token for that user.
 *
 * This indirection is the whole point of the module. Calling the service layer
 * directly from the agent would be one import and no network hop — and it would
 * quietly place the agent *outside* every guarantee the API makes. Going through
 * the endpoints means the agent is subject to `requireUser`, to the Zod schemas,
 * to `assertReferencesOwned`, and to the 404-not-403 rule, with no second
 * implementation of any of them to keep in sync.
 *
 * The token is minted, not borrowed. A Telegram message carries no credential —
 * the trust chain is: bot token proves the bot, webhook secret proves Telegram,
 * `chatId` proves the linked chat, and the linked chat maps to exactly one uid.
 * From that uid the Admin SDK mints a custom token, which Identity Toolkit
 * exchanges for an ID token indistinguishable from one a browser would hold.
 *
 * Consequently: **`uid` here comes only from the integration record.** Nothing
 * in a Telegram payload selects an account, which is what keeps the agent inside
 * the same tenant boundary as the rest of the system.
 */

const IDENTITY_TOOLKIT_URL =
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken";

/** Firebase ID tokens last an hour; refresh early enough to never race expiry. */
const TOKEN_TTL_MS = 50 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

const tokenCache = new Map<ID, { token: string; expiresAt: number }>();

async function mintIdToken(uid: ID): Promise<string> {
  const cached = tokenCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const apiKey = env.firebase.apiKey;
  if (!apiKey) {
    throw AppError.config(
      "NEXT_PUBLIC_FIREBASE_API_KEY is required to mint ID tokens for the agent.",
    );
  }

  const customToken = await getAdminAuth().createCustomToken(uid);

  const response = await fetch(`${IDENTITY_TOOLKIT_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as {
    idToken?: string;
  } | null;

  if (!response.ok || !payload?.idToken) {
    // The response body echoes the custom token on some failures, so only the
    // status is logged.
    logger.error("Custom token exchange failed", { uid, status: response.status });
    throw AppError.internal("לא ניתן לאמת את המשתמש מול Firebase.");
  }

  tokenCache.set(uid, {
    token: payload.idToken,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  return payload.idToken;
}

export interface ApiCallOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | undefined>;
}

/**
 * A bound client for one user. Every call is authenticated as that user and
 * every failure surfaces as the same `AppError` the browser would have seen.
 */
export interface AgentApiClient {
  call<T>(path: string, options?: ApiCallOptions): Promise<T>;
}

export function createAgentApiClient(uid: ID, baseUrl: string): AgentApiClient {
  const root = `${baseUrl.replace(/\/+$/, "")}${appConfig.apiBasePath}/${appConfig.apiVersion}`;

  return {
    async call<T>(path: string, options: ApiCallOptions = {}): Promise<T> {
      const { method = "GET", body, query } = options;

      const url = new URL(`${root}${path}`);
      for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== undefined && value !== "") url.searchParams.set(key, value);
      }

      const token = await mintIdToken(uid);

      let response: Response;

      try {
        response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
            [appConfig.requestIdHeader]: crypto.randomUUID(),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          cache: "no-store",
        });
      } catch (error) {
        throw AppError.internal("לא ניתן להגיע ל-API של המערכת.", error);
      }

      const envelope = (await response
        .json()
        .catch(() => null)) as ApiResponse<T> | null;

      if (!envelope) {
        throw new AppError(
          statusToErrorCode(response.status),
          `ה-API החזיר תשובה לא צפויה (${response.status}).`,
        );
      }

      if (!envelope.success) {
        throw new AppError(envelope.error.code, envelope.error.message, {
          details: envelope.error.details,
        });
      }

      return envelope.data;
    },
  };
}

function statusToErrorCode(status: number): ErrorCode {
  if (status === 401) return ERROR_CODES.UNAUTHORIZED;
  if (status === 403) return ERROR_CODES.FORBIDDEN;
  if (status === 404) return ERROR_CODES.NOT_FOUND;
  if (status === 409) return ERROR_CODES.CONFLICT;
  if (status === 429) return ERROR_CODES.RATE_LIMITED;
  return ERROR_CODES.INTERNAL_ERROR;
}

/**
 * Resolve the origin the agent should call itself on.
 *
 * `APP_BASE_URL` first — behind a proxy the request origin can be an internal
 * address the process cannot resolve. Otherwise the origin of the request that
 * carried the update, which is by construction an address that just worked.
 */
export function resolveSelfOrigin(requestOrigin: string): string {
  return serverEnv.appBaseUrl ?? requestOrigin;
}

/** Drop a cached token — used when an account is disconnected. */
export function forgetAgentToken(uid: ID): void {
  tokenCache.delete(uid);
}
