import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

import {
  readEnum,
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
} from "@/types";

/**
 * Web SDK document → DTO mappers.
 *
 * These mirror `@/services/server/refs.ts` field for field, and share the same
 * converters, so a task read over a realtime subscription is byte-identical to
 * one returned by the API. Anything else would make the optimistic-update
 * reconciliation in the mutation hooks unreliable.
 *
 * The duplication is deliberate: the two SDKs have incompatible snapshot types,
 * and a single generic mapper would need `any` at the seam.
 */

type ClientSnapshot = QueryDocumentSnapshot<DocumentData>;

export function toTask(snapshot: ClientSnapshot): Task {
  const data = snapshot.data();

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

export function toProject(snapshot: ClientSnapshot): Project {
  const data = snapshot.data();

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

export function toTag(snapshot: ClientSnapshot): Tag {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    userId: readString(data.userId),
    name: readString(data.name),
    color: readEnum(data.color, COLOR_TOKENS, DEFAULT_COLOR_TOKEN),
    createdAt: tsToIsoRequired(data.createdAt),
    updatedAt: tsToIsoRequired(data.updatedAt),
  };
}
