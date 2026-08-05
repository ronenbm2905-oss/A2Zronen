import { appConfig } from "@/config/app";
import { env, isFirebaseConfigured } from "@/config/env";
import { withApiHandler } from "@/lib/api";
import { toIsoString } from "@/utils";

/**
 * Infrastructure health probe — the only endpoint in this phase.
 *
 * It proves the full chain works end to end (env -> handler -> envelope) and
 * doubles as a readiness check for deployments. No business data.
 */

// Always evaluated at request time; never cached or prerendered.
export const dynamic = "force-dynamic";

export const GET = withApiHandler(async () => ({
  status: "ok",
  name: appConfig.name,
  version: appConfig.version,
  environment: env.appEnv,
  firebaseConfigured: isFirebaseConfigured,
  timestamp: toIsoString(),
}));
