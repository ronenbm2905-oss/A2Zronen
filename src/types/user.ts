import type { ID, ISODateString, Nullable } from "./common";

/**
 * The caller's identity, decoded from a verified Firebase ID token.
 * Produced only by `requireUser()` on the server and by the auth provider on
 * the client — never assembled from a request body.
 */
export interface AuthUser {
  uid: ID;
  email: Nullable<string>;
  displayName: Nullable<string>;
  emailVerified: boolean;
}

/**
 * The `users/{uid}` mirror document.
 *
 * Firebase Auth remains the source of truth for `displayName` and `email`;
 * this doc exists so profile data is queryable alongside the rest of the
 * tenant's data, and gives later phases somewhere to hang preferences.
 * Only `PATCH /api/v1/me` writes it, and that handler updates Auth in the same
 * call — so the two cannot drift.
 */
export interface UserProfile {
  userId: ID;
  email: Nullable<string>;
  displayName: Nullable<string>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
