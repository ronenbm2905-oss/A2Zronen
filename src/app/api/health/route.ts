import { appConfig } from "@/config/app";
import { env, isFirebaseConfigured } from "@/config/env";
import {
  isFirebaseAdminConfigured,
  isOpenAiConfigured,
  isSecretEncryptionConfigured,
} from "@/config/server-env";
import { withApiHandler } from "@/lib/api";
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

export const GET = withApiHandler(async () => ({
  status: "ok",
  name: appConfig.name,
  version: appConfig.version,
  environment: env.appEnv,
  firebaseConfigured: isFirebaseConfigured,
  firebaseAdminConfigured: isFirebaseAdminConfigured,
  openaiConfigured: isOpenAiConfigured,
  secretEncryptionConfigured: isSecretEncryptionConfigured,
  timestamp: toIsoString(),
}));
