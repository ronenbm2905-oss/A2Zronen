import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { LIMITS } from "@/constants/limits";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  CreateTaskInput,
  TaskFilterInput,
  UpdateTaskInput,
} from "@/lib/schemas";
import type { ID, Task } from "@/types";
import { unique } from "@/utils";

import { projectsRef, tagsRef, tasksRef, toTask } from "./refs";

/**
 * Task persistence.
 *
 * Every function here takes `uid` as its first argument, and that value comes
 * only from `requireUser()` — never from a request body. Three rules hold
 * throughout, and they are what make tenant isolation structural rather than
 * incidental:
 *
 * 1. Every list query opens with `where("userId", "==", uid)`.
 * 2. Every single-document read re-checks `userId` and reports **404, not 403**,
 *    on a mismatch, so the API never confirms that another user's task exists.
 * 3. `userId` is written once on create and can never be supplied on update —
 *    `updateTaskSchema` is `.strict()`, so a payload carrying it is a 400.
 */

const NOT_FOUND_MESSAGE = "המשימה לא נמצאה.";

/**
 * Verify that every referenced project and tag exists **and belongs to `uid`**.
 *
 * A foreign key pointing at another user's project is reported as a validation
 * error rather than a permission error: from the caller's perspective that id
 * simply is not a thing they can reference, and saying "forbidden" would confirm
 * it exists.
 */
async function assertReferencesOwned(
  uid: ID,
  projectId: ID | null | undefined,
  tagIds: ID[] | undefined,
): Promise<void> {
  if (projectId) {
    const snapshot = await projectsRef().doc(projectId).get();
    if (!snapshot.exists || snapshot.data()?.userId !== uid) {
      throw AppError.validation("הפרויקט שנבחר אינו קיים.", {
        projectId: ["הפרויקט שנבחר אינו קיים"],
      });
    }
  }

  const ids = unique(tagIds ?? []);
  if (ids.length === 0) return;

  const snapshots = await Promise.all(ids.map((id) => tagsRef().doc(id).get()));
  const invalid = snapshots.some(
    (snapshot) => !snapshot.exists || snapshot.data()?.userId !== uid,
  );

  if (invalid) {
    throw AppError.validation("אחת התגיות שנבחרו אינה קיימת.", {
      tagIds: ["אחת התגיות שנבחרו אינה קיימת"],
    });
  }
}

/** Fetch a task and assert ownership in one place. */
async function getOwnedTaskDoc(uid: ID, taskId: ID) {
  const snapshot = await tasksRef().doc(taskId).get();

  if (!snapshot.exists || snapshot.data()?.userId !== uid) {
    throw AppError.notFound(NOT_FOUND_MESSAGE);
  }

  return snapshot;
}

export async function getTask(uid: ID, taskId: ID): Promise<Task> {
  return toTask(await getOwnedTaskDoc(uid, taskId));
}

/**
 * List the caller's tasks.
 *
 * Ordering and the `limit` happen in Firestore; the remaining predicates are
 * applied in memory. Firestore cannot combine several inequality/array filters
 * in one query without a bespoke composite index per filter combination, and
 * this endpoint exists mainly as a non-realtime fallback — the UI reads through
 * `onSnapshot` and derives its own filtering (see D1 in the plan).
 */
export async function listTasks(
  uid: ID,
  filter?: Partial<TaskFilterInput>,
): Promise<Task[]> {
  const snapshot = await tasksRef()
    .where("userId", "==", uid)
    .orderBy("updatedAt", "desc")
    .limit(LIMITS.subscriptionMax)
    .get();

  let tasks = snapshot.docs.map(toTask);

  if (filter?.status?.length) {
    const allowed = new Set<string>(filter.status);
    tasks = tasks.filter((task) => allowed.has(task.status));
  }

  if (filter?.priority?.length) {
    const allowed = new Set<string>(filter.priority);
    tasks = tasks.filter((task) => allowed.has(task.priority));
  }

  if (filter?.projectId) {
    tasks = tasks.filter((task) => task.projectId === filter.projectId);
  }

  if (filter?.tagIds?.length) {
    const required = filter.tagIds;
    tasks = tasks.filter((task) =>
      required.every((tagId) => task.tagIds.includes(tagId)),
    );
  }

  if (filter?.search) {
    const needle = filter.search.toLocaleLowerCase();
    tasks = tasks.filter(
      (task) =>
        task.title.toLocaleLowerCase().includes(needle) ||
        task.description.toLocaleLowerCase().includes(needle),
    );
  }

  return tasks;
}

export async function createTask(
  uid: ID,
  input: CreateTaskInput,
): Promise<Task> {
  await assertReferencesOwned(uid, input.projectId, input.tagIds);

  const now = FieldValue.serverTimestamp();
  const isDone = input.status === "done";

  const document = await tasksRef().add({
    // Written from the verified token, never from the payload.
    userId: uid,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate ? Timestamp.fromDate(new Date(input.dueDate)) : null,
    projectId: input.projectId,
    tagIds: unique(input.tagIds),
    completedAt: isDone ? now : null,
    createdAt: now,
    updatedAt: now,
  });

  logger.info("Task created", { uid, taskId: document.id });

  return toTask(await document.get());
}

export async function updateTask(
  uid: ID,
  taskId: ID,
  input: UpdateTaskInput,
): Promise<Task> {
  const existing = await getOwnedTaskDoc(uid, taskId);

  await assertReferencesOwned(uid, input.projectId, input.tagIds);

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.projectId !== undefined) patch.projectId = input.projectId;
  if (input.tagIds !== undefined) patch.tagIds = unique(input.tagIds);

  if (input.dueDate !== undefined) {
    patch.dueDate = input.dueDate
      ? Timestamp.fromDate(new Date(input.dueDate))
      : null;
  }

  // `completedAt` is derived, never supplied: it is set when a task enters
  // `done` and cleared when it leaves, so it cannot disagree with `status`.
  if (input.status !== undefined) {
    patch.status = input.status;

    const wasDone = existing.data()?.status === "done";
    const isDone = input.status === "done";

    if (isDone && !wasDone) patch.completedAt = FieldValue.serverTimestamp();
    if (!isDone && wasDone) patch.completedAt = null;
  }

  await existing.ref.update(patch);

  logger.info("Task updated", { uid, taskId, fields: Object.keys(patch) });

  return toTask(await existing.ref.get());
}

export async function deleteTask(uid: ID, taskId: ID): Promise<{ id: ID }> {
  const existing = await getOwnedTaskDoc(uid, taskId);
  await existing.ref.delete();

  logger.info("Task deleted", { uid, taskId });

  return { id: taskId };
}
