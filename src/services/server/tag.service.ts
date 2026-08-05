import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { CreateTagInput, UpdateTagInput } from "@/lib/schemas";
import type { ID, Tag } from "@/types";

import { commitInChunks, tagsRef, tasksRef, toNameKey, toTag } from "./refs";

/**
 * Tag persistence. Same three isolation rules as `task.service.ts`.
 */

const NOT_FOUND_MESSAGE = "התגית לא נמצאה.";
const DUPLICATE_MESSAGE = "כבר קיימת תגית בשם הזה.";

async function assertNameAvailable(
  uid: ID,
  name: string,
  excludeId?: ID,
): Promise<void> {
  const snapshot = await tagsRef()
    .where("userId", "==", uid)
    .where("nameKey", "==", toNameKey(name))
    .limit(2)
    .get();

  const clash = snapshot.docs.some((doc) => doc.id !== excludeId);
  if (clash) throw AppError.conflict(DUPLICATE_MESSAGE);
}

async function getOwnedTagDoc(uid: ID, tagId: ID) {
  const snapshot = await tagsRef().doc(tagId).get();

  if (!snapshot.exists || snapshot.data()?.userId !== uid) {
    throw AppError.notFound(NOT_FOUND_MESSAGE);
  }

  return snapshot;
}

export async function getTag(uid: ID, tagId: ID): Promise<Tag> {
  return toTag(await getOwnedTagDoc(uid, tagId));
}

export async function listTags(uid: ID): Promise<Tag[]> {
  const snapshot = await tagsRef()
    .where("userId", "==", uid)
    .orderBy("name", "asc")
    .get();

  return snapshot.docs.map(toTag);
}

export async function createTag(uid: ID, input: CreateTagInput): Promise<Tag> {
  await assertNameAvailable(uid, input.name);

  const now = FieldValue.serverTimestamp();

  const document = await tagsRef().add({
    userId: uid,
    name: input.name,
    nameKey: toNameKey(input.name),
    color: input.color,
    createdAt: now,
    updatedAt: now,
  });

  logger.info("Tag created", { uid, tagId: document.id });

  return toTag(await document.get());
}

export async function updateTag(
  uid: ID,
  tagId: ID,
  input: UpdateTagInput,
): Promise<Tag> {
  const existing = await getOwnedTagDoc(uid, tagId);

  if (input.name !== undefined) {
    await assertNameAvailable(uid, input.name, tagId);
  }

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (input.name !== undefined) {
    patch.name = input.name;
    patch.nameKey = toNameKey(input.name);
  }
  if (input.color !== undefined) patch.color = input.color;

  await existing.ref.update(patch);

  logger.info("Tag updated", { uid, tagId, fields: Object.keys(patch) });

  return toTag(await existing.ref.get());
}

/**
 * Delete a tag and strip it from every task that carried it.
 *
 * `arrayRemove` is used rather than rewriting `tagIds` wholesale so a concurrent
 * edit to the same task's other tags is not clobbered.
 *
 * Requires the `(userId ASC, tagIds ARRAY_CONTAINS)` composite index declared in
 * `firestore.indexes.json`.
 */
export async function deleteTag(
  uid: ID,
  tagId: ID,
): Promise<{ id: ID; detachedTasks: number }> {
  const existing = await getOwnedTagDoc(uid, tagId);

  const affected = await tasksRef()
    .where("userId", "==", uid)
    .where("tagIds", "array-contains", tagId)
    .get();

  const now = FieldValue.serverTimestamp();

  await commitInChunks(
    affected.docs,
    (batch, task) =>
      batch.update(task.ref, {
        tagIds: FieldValue.arrayRemove(tagId),
        updatedAt: now,
      }),
    (batch) => batch.delete(existing.ref),
  );

  logger.info("Tag deleted", { uid, tagId, detachedTasks: affected.size });

  return { id: tagId, detachedTasks: affected.size };
}

/** How many tasks carry this tag — powers the confirm dialog's copy. */
export async function countTagTasks(uid: ID, tagId: ID): Promise<number> {
  const snapshot = await tasksRef()
    .where("userId", "==", uid)
    .where("tagIds", "array-contains", tagId)
    .count()
    .get();

  return snapshot.data().count;
}
