import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { isFirebaseAdminConfigured, serverEnv } from "@/config/server-env";
import { AppError } from "@/lib/errors";

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

function readAdminApp(): App {
  const { projectId, clientEmail, privateKey } = serverEnv.firebaseAdmin;

  if (!projectId || !clientEmail || !privateKey) {
    throw AppError.config(
      "Firebase Admin is not configured. Fill in FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local.",
    );
  }

  // A named app keeps this instance distinct from anything else that might call
  // `initializeApp()`, and the lookup guards against re-init across hot reloads.
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) return existing;

  return initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey }), projectId },
    ADMIN_APP_NAME,
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

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export { isFirebaseAdminConfigured };
