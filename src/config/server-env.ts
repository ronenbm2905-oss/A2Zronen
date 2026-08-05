import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";

/**
 * Server-only environment configuration — every secret the server holds.
 *
 * This lives apart from `@/config/env` on purpose. `env.ts` is imported by
 * `lib/firebase/client.ts` and therefore reaches the browser bundle. Putting a
 * private key there would technically work (Next replaces non-`NEXT_PUBLIC_`
 * reads with `undefined` client-side), but it would rest on a build-tool
 * guarantee. `import "server-only"` turns the same mistake into a build error
 * that names the offending file.
 *
 * It keeps the two rules `env.ts` established:
 *
 * 1. Every `process.env.*` read is a **literal, static** property access.
 * 2. Parsing **never throws at import time** — an unconfigured `.env.local`
 *    must not stop the app from booting. Consumers check the matching
 *    `is*Configured` gate and fail loudly at the point of use.
 *
 * Note what is deliberately **absent**: the Telegram bot token. That is
 * per-user data, supplied through the settings screen and stored encrypted in
 * Firestore, so swapping bots never touches this file. See
 * `@/services/server/integration.service`.
 */

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * A PEM key cannot survive a `.env` file with real newlines, so service account
 * keys are pasted with literal `\n` escapes. Restore them here — forgetting this
 * is the single most common setup failure, and it surfaces as an opaque
 * "error:1E08010C:DECODER routines::unsupported" from OpenSSL.
 */
function restoreNewlines(value: string | undefined): string | undefined {
  return value?.replace(/\\n/g, "\n");
}

const optionalString = z.string().min(1).optional();

/**
 * The public origin the app is reachable at. Only Telegram needs it: `setWebhook`
 * takes an absolute URL, and Telegram must be able to resolve it — so the request
 * origin the server sees is useless behind a tunnel or a proxy. Left unset, the
 * webhook registration falls back to the incoming request's origin, which is
 * correct in production and simply unreachable on `localhost`.
 */
const baseUrlSchema = z
  .url({ protocol: /^https?$/ })
  .transform((value) => value.replace(/\/+$/, ""))
  .optional();

const serverEnvSchema = z.object({
  FIREBASE_PROJECT_ID: optionalString,
  FIREBASE_CLIENT_EMAIL: optionalString,
  FIREBASE_PRIVATE_KEY: optionalString,

  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),

  // 32 bytes, base64 or hex — see `@/lib/crypto/secret-box`.
  SECRET_ENCRYPTION_KEY: optionalString,

  APP_BASE_URL: baseUrlSchema,
});

const parsed = serverEnvSchema.safeParse({
  FIREBASE_PROJECT_ID: blankToUndefined(process.env.FIREBASE_PROJECT_ID),
  FIREBASE_CLIENT_EMAIL: blankToUndefined(process.env.FIREBASE_CLIENT_EMAIL),
  FIREBASE_PRIVATE_KEY: restoreNewlines(
    blankToUndefined(process.env.FIREBASE_PRIVATE_KEY),
  ),
  OPENAI_API_KEY: blankToUndefined(process.env.OPENAI_API_KEY),
  OPENAI_MODEL: blankToUndefined(process.env.OPENAI_MODEL),
  SECRET_ENCRYPTION_KEY: blankToUndefined(process.env.SECRET_ENCRYPTION_KEY),
  APP_BASE_URL: blankToUndefined(process.env.APP_BASE_URL),
});

if (!parsed.success) {
  logger.warn(
    "Invalid server environment configuration — the Admin SDK will be unavailable.",
    z.flattenError(parsed.error).fieldErrors,
  );
}

// Safe: every field is optional, so `{}` always parses.
const values = parsed.success ? parsed.data : serverEnvSchema.parse({});

export const serverEnv = {
  firebaseAdmin: {
    projectId: values.FIREBASE_PROJECT_ID,
    clientEmail: values.FIREBASE_CLIENT_EMAIL,
    privateKey: values.FIREBASE_PRIVATE_KEY,
  },

  openai: {
    apiKey: values.OPENAI_API_KEY,
    model: values.OPENAI_MODEL,
  },

  /** Key for `@/lib/crypto/secret-box`, which wraps stored bot tokens. */
  secretEncryptionKey: values.SECRET_ENCRYPTION_KEY,

  appBaseUrl: values.APP_BASE_URL,
} as const;

/**
 * Whether a service-account key was pasted into `.env.local`. This is how the
 * Admin SDK authenticates off Google infrastructure — in practice, locally.
 */
export const hasAdminServiceAccountKey: boolean = Boolean(
  serverEnv.firebaseAdmin.projectId &&
    serverEnv.firebaseAdmin.clientEmail &&
    serverEnv.firebaseAdmin.privateKey,
);

/**
 * Whether Application Default Credentials are available.
 *
 * On App Hosting the container runs as a service account and the Admin SDK can
 * authenticate with no key at all, so requiring `FIREBASE_PRIVATE_KEY` there
 * would mean minting a downloadable key and storing it in Secret Manager to
 * re-supply a credential the runtime already holds. Each of these variables is
 * set by the platform, never by us:
 *
 * - `K_SERVICE` — Cloud Run, which is what App Hosting deploys onto.
 * - `FIREBASE_CONFIG` — injected by Firebase-managed runtimes.
 * - `GOOGLE_APPLICATION_CREDENTIALS` — a key file path; the local ADC opt-in.
 *
 * A false positive costs an honest `CONFIG_ERROR` on the first admin call, the
 * same failure the missing-key path produces.
 */
export const hasApplicationDefaultCredentials: boolean = Boolean(
  blankToUndefined(process.env.K_SERVICE) ??
    blankToUndefined(process.env.FIREBASE_CONFIG) ??
    blankToUndefined(process.env.GOOGLE_APPLICATION_CREDENTIALS),
);

/** True when the Admin SDK can authenticate by either route. */
export const isFirebaseAdminConfigured: boolean =
  hasAdminServiceAccountKey || hasApplicationDefaultCredentials;

/** True when the AI agent can be reached. Checked before answering a message. */
export const isOpenAiConfigured: boolean = Boolean(serverEnv.openai.apiKey);

/**
 * True when bot tokens can be encrypted at rest. Checked **before** accepting a
 * token, so a missing key can never lead to one being stored in the clear.
 */
export const isSecretEncryptionConfigured: boolean = Boolean(
  serverEnv.secretEncryptionKey,
);

export type ServerEnv = typeof serverEnv;
