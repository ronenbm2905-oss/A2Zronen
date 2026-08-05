import "server-only";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import {
  hasAdminServiceAccountKey,
  hasApplicationDefaultCredentials,
  isFirebaseAdminConfigured,
  serverEnv,
} from "@/config/server-env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Firebase Admin SDK connection point — the only writer in this system.
 *
 * It mirrors the discipline of `client.ts`: initialization is **lazy**, so
 * importing this module never throws and the app boots fine with an
 * unconfigured `.env.local`. The failure surfaces only when a request actually
 * needs the SDK, as a `CONFIG_ERROR` (HTTP 500) rather than a crash at startup.
 *
 * The Admin SDK **bypasses Firestore security rules entirely**. Every function
 * that touches it is therefore responsible for its own tenant scoping — see
 * `@/services/server` where `userId` always comes from the verified token.
 */

const ADMIN_APP_NAME = "a2z-admin";

let cachedApp: App | null = null;

/**
 * Two ways to authenticate, in the order they should be preferred.
 *
 * An explicit key wins when present, so a developer pointing `.env.local` at a
 * different project always gets that project — even while signed in to gcloud
 * as something else. Otherwise fall back to the credentials the platform
 * already attached to the container: on App Hosting the service is a service
 * account, so requiring a pasted key there would mean generating a downloadable
 * one purely to hand back a credential the runtime holds already.
 */
function readAdminApp(): App {
  const { projectId, clientEmail, privateKey } = serverEnv.firebaseAdmin;

  // A named app keeps this instance distinct from anything else that might call
  // `initializeApp()`, and the lookup guards against re-init across hot reloads.
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) return existing;

  if (hasAdminServiceAccountKey && projectId && clientEmail && privateKey) {
    return initializeApp(
      { credential: cert({ projectId, clientEmail, privateKey }), projectId },
      ADMIN_APP_NAME,
    );
  }

  if (hasApplicationDefaultCredentials) {
    return initializeApp(
      {
        credential: applicationDefault(),
        // Omitted rather than passed as `undefined`: with no value the SDK
        // reads the project off the credential itself, which is correct.
        ...(projectId ? { projectId } : {}),
      },
      ADMIN_APP_NAME,
    );
  }

  throw AppError.config(
    "Firebase Admin is not configured. Fill in FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local, or run somewhere Application Default Credentials are available.",
  );
}

/**
 * Return the singleton Admin app, initializing it on first use.
 *
 * @throws {AppError} `CONFIG_ERROR` when the `FIREBASE_*` server variables are
 * not fully populated.
 */
export function getAdminApp(): App {
  cachedApp ??= readAdminApp();
  return cachedApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/**
 * Can this process **sign** a custom token?
 *
 * Being authenticated and being able to sign are not the same capability, and
 * the difference is invisible until something needs the second one. With an
 * explicit service-account key the SDK signs locally. On Application Default
 * Credentials there is no key, so it delegates to Google's IAM signBlob API —
 * which the runtime service account may not be allowed to call.
 *
 * `@/lib/ai/api-caller` mints a token per agent action, so when this is false
 * every Telegram change fails at the moment the user confirms it, and the bot
 * can only report a generic failure. Reported as a flag because that symptom
 * gives no hint of the cause.
 *
 * The uid is never looked up — `createCustomToken` only signs a JWT, so this
 * neither creates nor requires an account.
 */
export async function canSignCustomTokens(): Promise<boolean> {
  try {
    await getAdminAuth().createCustomToken("health-check-probe");
    return true;
  } catch (error) {
    logger.warn("Admin SDK cannot sign custom tokens", { error });
    return false;
  }
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export { isFirebaseAdminConfigured };
