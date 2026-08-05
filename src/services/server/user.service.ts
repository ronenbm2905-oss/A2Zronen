import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";
import type { UpdateProfileInput } from "@/lib/schemas";
import type { AuthUser, UserProfile } from "@/types";

import { projectsRef, tagsRef, toNameKey, toUserProfile, usersRef } from "./refs";

/**
 * Profile and first-run setup.
 *
 * Firebase Auth stays the source of truth for `displayName` and `email`; the
 * `users/{uid}` document mirrors them so profile data sits alongside the rest of
 * the tenant's records. `updateProfile` writes both in one call, so the two
 * cannot drift.
 */

/** Seeded on first sign-in so a new account is not an empty screen. */
const STARTER_PROJECT = {
  name: "כללי",
  description: "פרויקט ברירת המחדל למשימות שאינן שייכות לפרויקט אחר.",
  color: "sky",
} as const;

const STARTER_TAGS = [
  { name: "עבודה", color: "blue" },
  { name: "אישי", color: "rose" },
  { name: "דחוף", color: "warning" },
] as const;

export async function getProfile(user: AuthUser): Promise<UserProfile> {
  const snapshot = await usersRef().doc(user.uid).get();

  if (snapshot.exists) return toUserProfile(snapshot);

  // The mirror can be absent for an account created before bootstrap ran, or if
  // bootstrap failed. Reporting the token's own claims keeps `/settings` working
  // rather than 404-ing on the user's own profile.
  return {
    userId: user.uid,
    email: user.email,
    displayName: user.displayName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateProfile(
  user: AuthUser,
  input: UpdateProfileInput,
): Promise<UserProfile> {
  // Auth first: if this fails the mirror is untouched and stays consistent.
  await getAdminAuth().updateUser(user.uid, { displayName: input.displayName });

  await usersRef().doc(user.uid).set(
    {
      userId: user.uid,
      email: user.email,
      displayName: input.displayName,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  logger.info("Profile updated", { uid: user.uid });

  return getProfile({ ...user, displayName: input.displayName });
}

/**
 * Idempotent first-run setup, called once after registration.
 *
 * Safe to call repeatedly: the profile write is a merge, and the starter content
 * is created only when the user has no projects and no tags at all. That check
 * also means a user who deliberately deleted the starter project will not have
 * it reappear on their next sign-in.
 */
export async function bootstrapUser(user: AuthUser): Promise<UserProfile> {
  const profileRef = usersRef().doc(user.uid);
  const existing = await profileRef.get();

  await profileRef.set(
    {
      userId: user.uid,
      email: user.email,
      displayName: user.displayName,
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (!existing.exists) {
    await seedStarterContent(user);
  }

  logger.info("User bootstrapped", { uid: user.uid, isNew: !existing.exists });

  return getProfile(user);
}

async function seedStarterContent(user: AuthUser): Promise<void> {
  const [projects, tags] = await Promise.all([
    projectsRef().where("userId", "==", user.uid).limit(1).get(),
    tagsRef().where("userId", "==", user.uid).limit(1).get(),
  ]);

  const now = FieldValue.serverTimestamp();

  if (projects.empty) {
    await projectsRef().add({
      userId: user.uid,
      name: STARTER_PROJECT.name,
      nameKey: toNameKey(STARTER_PROJECT.name),
      description: STARTER_PROJECT.description,
      color: STARTER_PROJECT.color,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (tags.empty) {
    await Promise.all(
      STARTER_TAGS.map((tag) =>
        tagsRef().add({
          userId: user.uid,
          name: tag.name,
          nameKey: toNameKey(tag.name),
          color: tag.color,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
  }
}
