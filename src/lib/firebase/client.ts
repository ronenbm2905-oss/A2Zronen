import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors";

/**
 * Firebase Web SDK connection point.
 *
 * Initialization is **lazy** on purpose: importing this module must never throw,
 * so the app boots fine with an unconfigured `.env.local`. The failure surfaces
 * only when something actually asks for the app instance.
 *
 * `getFirebaseAuth()` and `getFirestoreDb()` are the two seams built on top of
 * it. Firestore here is **read-only in practice**: `firestore.rules` denies every
 * client write, so this SDK is used solely for `onSnapshot` subscriptions while
 * all mutations go through `/api/v1`.
 *
 * Nothing in this module may be called during render or at module scope — the
 * accessors throw when unconfigured, which would take down a prerender. Call
 * them from `useEffect`, an event handler or a subscription setup.
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

/**
 * Firebase Auth for the browser. The SDK caches its own instance per app, so no
 * extra memoization is needed here.
 *
 * @throws {AppError} `CONFIG_ERROR` when Firebase is not configured.
 */
export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

/**
 * Firestore for the browser — realtime reads only. Writes are rejected by
 * `firestore.rules`; use `@/lib/api-client` instead.
 *
 * @throws {AppError} `CONFIG_ERROR` when Firebase is not configured.
 */
export function getFirestoreDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
