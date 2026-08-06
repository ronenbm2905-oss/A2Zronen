import { appConfig } from "@/config/app";
import { env, isFirebaseConfigured } from "@/config/env";
import {
  isFirebaseAdminConfigured,
  isOpenAiConfigured,
  isSecretEncryptionConfigured,
  serverEnv,
} from "@/config/server-env";
import { withApiHandler } from "@/lib/api";
import { canSignCustomTokens } from "@/lib/firebase/admin";
import { toIsoString } from "@/utils";

/**
 * Infrastructure health probe.
 *
 * It proves the full chain works end to end (env -> handler -> envelope) and
 * doubles as a readiness check for deployments. No business data.
 *
 * The `*Configured` flags are the first thing to check when the app boots but
 * nothing works: they separate "the browser cannot reach Firebase" from "the
 * server has no service account", which fail in very different places. The same
 * reasoning extends to the integration flags — a Telegram bot that connects but
 * never answers is almost always a missing `OPENAI_API_KEY`.
 *
 * Only booleans are reported. Nothing here narrows down a secret's value.
 */

// Always evaluated at request time; never cached or prerendered.
export const dynamic = "force-dynamic";

/**
 * Assembled at call time so the bundler cannot recognise it as a `NEXT_PUBLIC_*`
 * read and substitute the build-time value — which is the whole point: comparing
 * it against `env.appEnv` separates "the variable never made it into the bundle"
 * from "it never made it into the container". Diagnostic only; drop it once
 * `apphosting.yaml` is confirmed to be delivering both.
 */
function readAppEnvAtRuntime(): string | null {
  return process.env[["NEXT_PUBLIC", "APP_ENV"].join("_")] ?? null;
}

export const GET = withApiHandler(async () => ({
  status: "ok",
  name: appConfig.name,
  version: appConfig.version,
  environment: env.appEnv,
  // Both diagnostics for the same puzzle: production reports `development`
  // although `apphosting.yaml` sets `production` at BUILD and RUNTIME.
  // `appEnvAtRuntime` is the container's actual value; `appBaseUrlSet` is a
  // RUNTIME-only variable from the same file, so if it is false the file's
  // runtime block is not being applied at all. Neither is a secret.
  appEnvAtRuntime: readAppEnvAtRuntime(),
  appBaseUrlSet: Boolean(serverEnv.appBaseUrl),
  firebaseConfigured: isFirebaseConfigured,
  firebaseAdminConfigured: isFirebaseAdminConfigured,
  // Separate from the flag above on purpose: the Admin SDK can be fully
  // authenticated and still unable to sign a custom token, which takes the
  // Telegram agent down while every other server path keeps working.
  adminCanSignTokens: isFirebaseAdminConfigured
    ? await canSignCustomTokens()
    : false,
  openaiConfigured: isOpenAiConfigured,
  secretEncryptionConfigured: isSecretEncryptionConfigured,
  timestamp: toIsoString(),
}));
