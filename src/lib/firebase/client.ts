import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors";

/**
 * Firebase Web SDK connection point.
 *
 * Initialization is **lazy** on purpose: importing this module must never throw,
 * so the app boots fine with an unconfigured `.env.local`. The failure surfaces
 * only when something actually asks for the app instance.
 *
 * Nothing calls `getFirebaseApp()` in this phase — it is the seam that Auth and
 * Firestore will be built on in the next one.
 */

let cachedApp: FirebaseApp | null = null;

/**
 * Build a fully-populated `FirebaseOptions`, or `null` if any required key is
 * missing. The explicit checks let TypeScript narrow each value to `string`.
 */
export function readFirebaseConfig(): FirebaseOptions | null {
  const {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
  } = env.firebase;

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    // Analytics-only and optional — omit rather than send `undefined`.
    ...(measurementId ? { measurementId } : {}),
  };
}

/**
 * Return the singleton Firebase app, initializing it on first use.
 *
 * @throws {AppError} `CONFIG_ERROR` when the `NEXT_PUBLIC_FIREBASE_*` variables
 * are not fully populated.
 */
export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;

  const config = readFirebaseConfig();

  if (!config) {
    throw AppError.config(
      "Firebase is not configured. Fill in the NEXT_PUBLIC_FIREBASE_* variables in .env.local.",
    );
  }

  // Guard against re-initialization across hot reloads in development.
  cachedApp = getApps().length > 0 ? getApp() : initializeApp(config);

  return cachedApp;
}
