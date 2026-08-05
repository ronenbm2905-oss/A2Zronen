import { z } from "zod";

import { logger } from "@/lib/logger";

/**
 * Environment configuration — the single source of truth for env access.
 *
 * Two rules this module exists to enforce:
 *
 * 1. Every `process.env.*` read is a **literal, static** property access.
 *    Next.js inlines `NEXT_PUBLIC_*` variables at build time by textual
 *    substitution, so dynamic lookups (`process.env[key]`) silently resolve to
 *    `undefined` in the browser bundle.
 *
 * 2. Parsing **never throws at import time**. An unconfigured `.env.local`
 *    must not stop the app from booting — consumers check
 *    `isFirebaseConfigured` and fail loudly only at the point of use.
 */

/** Treat empty / whitespace-only values as "not set" so blanks fall back to defaults. */
function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const optionalString = z.string().min(1).optional();

const envSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: optionalString,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: optionalString,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: optionalString,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: optionalString,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: optionalString,
  NEXT_PUBLIC_FIREBASE_APP_ID: optionalString,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: optionalString,
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_FIREBASE_API_KEY: blankToUndefined(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  ),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: blankToUndefined(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: blankToUndefined(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: blankToUndefined(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  ),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: blankToUndefined(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  NEXT_PUBLIC_FIREBASE_APP_ID: blankToUndefined(
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: blankToUndefined(
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  ),
  NEXT_PUBLIC_APP_ENV: blankToUndefined(process.env.NEXT_PUBLIC_APP_ENV),
});

if (!parsed.success) {
  logger.warn(
    "Invalid environment configuration — falling back to defaults.",
    z.flattenError(parsed.error).fieldErrors,
  );
}

// Safe: every field is optional or has a default, so `{}` always parses.
const values = parsed.success ? parsed.data : envSchema.parse({});

export const env = {
  appEnv: values.NEXT_PUBLIC_APP_ENV,
  isDevelopment: values.NEXT_PUBLIC_APP_ENV === "development",
  isProduction: values.NEXT_PUBLIC_APP_ENV === "production",

  firebase: {
    apiKey: values.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: values.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: values.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: values.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: values.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: values.NEXT_PUBLIC_FIREBASE_APP_ID,
    /** Analytics only — not required for Firebase to initialize. */
    measurementId: values.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
} as const;

/**
 * True only when every Firebase key required by `initializeApp` is present.
 * `measurementId` is intentionally excluded — it is optional.
 */
export const isFirebaseConfigured: boolean = Boolean(
  env.firebase.apiKey &&
    env.firebase.authDomain &&
    env.firebase.projectId &&
    env.firebase.storageBucket &&
    env.firebase.messagingSenderId &&
    env.firebase.appId,
);

export type Env = typeof env;
export type AppEnv = Env["appEnv"];
