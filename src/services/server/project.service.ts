import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { CreateProjectInput, UpdateProjectInput } from "@/lib/schemas";
import type { ID, Project } from "@/types";

import {
  commitInChunks,
  projectsRef,
  tasksRef,
  toNameKey,
  toProject,
} from "./refs";

/**
 * Project persistence. Same three isolation rules as `task.service.ts`.
 */

const NOT_FOUND_MESSAGE = "הפרויקט לא נמצא.";
const DUPLICATE_MESSAGE = "כבר קיים פרויקט בשם הזה.";

/**
 * Reject a duplicate name within this user's projects.
 *
 * This is a check-then-write, so two simultaneous creates could both pass. That
 * is accepted: a tenant is a single person, and the failure mode is a duplicate
 * name rather than data loss. A transaction is the fix if it ever matters.
 */
async function assertNameAvailable(
  uid: ID,
  name: string,
  excludeId?: ID,
): Promise<void> {
  const snapshot = await projectsRef()
    .where("userId", "==", uid)
    .where("nameKey", "==", toNameKey(name))
    .limit(2)
    .get();

  const clash = snapshot.docs.some((doc) => doc.id !== excludeId);
  if (clash) throw AppError.conflict(DUPLICATE_MESSAGE);
}

async function getOwnedProjectDoc(uid: ID, projectId: ID) {
  const snapshot = await projectsRef().doc(projectId).get();

  if (!snapshot.exists || snapshot.data()?.userId !== uid) {
    throw AppError.notFound(NOT_FOUND_MESSAGE);
  }

  return snapshot;
}

export async function getProject(uid: ID, projectId: ID): Promise<Project> {
  return toProject(await getOwnedProjectDoc(uid, projectId));
}

export async function listProjects(uid: ID): Promise<Project[]> {
  const snapshot = await projectsRef()
    .where("userId", "==", uid)
    .orderBy("name", "asc")
    .get();

  return snapshot.docs.map(toProject);
}

export async function createProject(
  uid: ID,
  input: CreateProjectInput,
): Promise<Project> {
  await assertNameAvailable(uid, input.name);

  const now = FieldValue.serverTimestamp();

  const document = await projectsRef().add({
    userId: uid,
    name: input.name,
    nameKey: toNameKey(input.name),
    description: input.description,
    color: input.color,
    createdAt: now,
    updatedAt: now,
  });

  logger.info("Project created", { uid, projectId: document.id });

  return toProject(await document.get());
}

export async function updateProject(
  uid: ID,
  projectId: ID,
  input: UpdateProjectInput,
): Promise<Project> {
  const existing = await getOwnedProjectDoc(uid, projectId);

  if (input.name !== undefined) {
    await assertNameAvailable(uid, input.name, projectId);
  }

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (input.name !== undefined) {
    patch.name = input.name;
    patch.nameKey = toNameKey(input.name);
  }
  if (input.description !== undefined) patch.description = input.description;
  if (input.color !== undefined) patch.color = input.color;

  await existing.ref.update(patch);

  logger.info("Project updated", { uid, projectId, fields: Object.keys(patch) });

  return toProject(await existing.ref.get());
}

/**
 * Delete a project and **detach** its tasks rather than deleting them.
 *
 * A project is an organisational label; removing it must never destroy work.
 * Affected tasks get `projectId: null` and land in "ללא פרויקט". The whole thing
 * runs in one batch so a task can never be orphaned by a partial failure —
 * pointing at a project id that no longer exists.
 *
 * @returns the number of tasks detached, so the UI can report it.
 */
export async function deleteProject(
  uid: ID,
  projectId: ID,
): Promise<{ id: ID; detachedTasks: number }> {
  const existing = await getOwnedProjectDoc(uid, projectId);

  const affected = await tasksRef()
    .where("userId", "==", uid)
    .where("projectId", "==", projectId)
    .get();

  const now = FieldValue.serverTimestamp();

  await commitInChunks(
    affected.docs,
    (batch, task) => batch.update(task.ref, { projectId: null, updatedAt: now }),
    (batch) => batch.delete(existing.ref),
  );

  logger.info("Project deleted", {
    uid,
    projectId,
    detachedTasks: affected.size,
  });

  return { id: projectId, detachedTasks: affected.size };
}

/** How many tasks a delete would detach — powers the confirm dialog's copy. */
export async function countProjectTasks(uid: ID, projectId: ID): Promise<number> {
  const snapshot = await tasksRef()
    .where("userId", "==", uid)
    .where("projectId", "==", projectId)
    .count()
    .get();

  return snapshot.data().count;
}
