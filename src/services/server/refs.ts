import "server-only";

import type {
  CollectionReference,
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  WriteBatch,
} from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  readEnum,
  readNullableNumber,
  readNullableString,
  readString,
  readStringArray,
  tsToIso,
  tsToIsoRequired,
} from "@/lib/firebase/converters";
import {
  COLOR_TOKENS,
  DEFAULT_COLOR_TOKEN,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Project,
  type Tag,
  type Task,
  type TelegramIntegration,
  type UserProfile,
} from "@/types";

/**
 * Collection handles and document → DTO mappers for the Admin SDK.
 *
 * Collections are top-level with a `userId` field on every document. Ownership
 * is therefore a *query predicate*, not a path segment, which is why every
 * function in the sibling services opens with `where("userId", "==", uid)` and
 * every single-document read re-checks `userId` after fetching.
 */

export const COLLECTIONS = {
  tasks: "tasks",
  projects: "projects",
  tags: "tags",
  users: "users",
  /** Keyed by uid. Holds sealed bot tokens — denied to clients in the rules. */
  integrations: "integrations",
  /** Keyed by `<uid>:<chatId>`. Conversation state for the Telegram agent. */
  agentSessions: "agentSessions",
} as const;

export function tasksRef(): CollectionReference<DocumentData> {
  return getAdminDb().collection(COLLECTIONS.tasks);
}

export function projectsRef(): CollectionReference<DocumentData> {
  return getAdminDb().collection(COLLECTIONS.projects);
}

export function tagsRef(): CollectionReference<DocumentData> {
  return getAdminDb().collection(COLLECTIONS.tags);
}

export function usersRef(): CollectionReference<DocumentData> {
  return getAdminDb().collection(COLLECTIONS.users);
}

export function integrationsRef(): CollectionReference<DocumentData> {
  return getAdminDb().collection(COLLECTIONS.integrations);
}

export function agentSessionsRef(): CollectionReference<DocumentData> {
  return getAdminDb().collection(COLLECTIONS.agentSessions);
}

type AnySnapshot = DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>;

/**
 * A Firestore `WriteBatch` accepts at most 500 operations. Cascades here touch
 * one document per affected task, so a busy project would silently blow that
 * limit. `commitInChunks` splits the work into conforming batches.
 *
 * The trade-off: chunks commit independently, so a failure part-way leaves
 * earlier chunks applied. Both cascades are idempotent detaches (`projectId`
 * to `null`, `arrayRemove` of a tag), so a retry converges rather than
 * compounding — which is why this is preferable to failing outright at 500.
 */
const MAX_BATCH_OPERATIONS = 450;

export async function commitInChunks<T>(
  items: readonly T[],
  apply: (batch: WriteBatch, item: T) => void,
  finalize?: (batch: WriteBatch) => void,
): Promise<void> {
  const db = getAdminDb();
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += MAX_BATCH_OPERATIONS) {
    chunks.push(items.slice(index, index + MAX_BATCH_OPERATIONS));
  }

  // Always run at least once so `finalize` still executes when nothing matched.
  if (chunks.length === 0) chunks.push([]);

  for (const [index, chunk] of chunks.entries()) {
    const batch = db.batch();
    for (const item of chunk) apply(batch, item);

    // The terminal operation (deleting the project or tag itself) belongs to the
    // last batch, so the record survives until every dependent write is done.
    if (finalize && index === chunks.length - 1) finalize(batch);

    await batch.commit();
  }
}

/**
 * Per-user uniqueness key for a project or tag name.
 *
 * Stored alongside `name` so the check is an equality query — no composite index,
 * and no client-side scan. Case- and whitespace-insensitive so "עבודה" and
 * " עבודה " are the same name to a person and to the database.
 */
export function toNameKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function toTask(snapshot: AnySnapshot): Task {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    userId: readString(data.userId),
    title: readString(data.title),
    description: readString(data.description),
    status: readEnum(data.status, TASK_STATUSES, "todo"),
    priority: readEnum(data.priority, TASK_PRIORITIES, "medium"),
    dueDate: tsToIso(data.dueDate),
    projectId: readNullableString(data.projectId),
    tagIds: readStringArray(data.tagIds),
    completedAt: tsToIso(data.completedAt),
    createdAt: tsToIsoRequired(data.createdAt),
    updatedAt: tsToIsoRequired(data.updatedAt),
  };
}

export function toProject(snapshot: AnySnapshot): Project {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    userId: readString(data.userId),
    name: readString(data.name),
    description: readString(data.description),
    color: readEnum(data.color, COLOR_TOKENS, DEFAULT_COLOR_TOKEN),
    createdAt: tsToIsoRequired(data.createdAt),
    updatedAt: tsToIsoRequired(data.updatedAt),
  };
}

export function toTag(snapshot: AnySnapshot): Tag {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    userId: readString(data.userId),
    name: readString(data.name),
    color: readEnum(data.color, COLOR_TOKENS, DEFAULT_COLOR_TOKEN),
    createdAt: tsToIsoRequired(data.createdAt),
    updatedAt: tsToIsoRequired(data.updatedAt),
  };
}

/**
 * The `integrations/{uid}` document.
 *
 * `botTokenSealed` is carried through as stored. This mapper is the *internal*
 * shape; the projection that reaches a browser is built by
 * `toTelegramStatus` in `integration.service.ts`, and it drops this field.
 */
export function toTelegramIntegration(
  snapshot: AnySnapshot,
): TelegramIntegration {
  const data = snapshot.data() ?? {};

  return {
    userId: snapshot.id,
    botTokenSealed: readString(data.botTokenSealed),
    botId: readNullableNumber(data.botId),
    botUsername: readNullableString(data.botUsername),
    botName: readNullableString(data.botName),
    webhookId: readString(data.webhookId),
    webhookSecret: readString(data.webhookSecret),
    webhookRegistered: data.webhookRegistered === true,
    webhookMessage: readNullableString(data.webhookMessage),
    linkCode: readNullableString(data.linkCode),
    chatId: readNullableNumber(data.chatId),
    connectedAt: tsToIso(data.connectedAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export function toUserProfile(snapshot: AnySnapshot): UserProfile {
  const data = snapshot.data() ?? {};

  return {
    userId: snapshot.id,
    email: readNullableString(data.email),
    displayName: readNullableString(data.displayName),
    createdAt: tsToIsoRequired(data.createdAt),
    updatedAt: tsToIsoRequired(data.updatedAt),
  };
}
