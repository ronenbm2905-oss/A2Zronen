import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import { LIMITS } from "@/constants/limits";
import { getFirestoreDb } from "@/lib/firebase/client";
import type { ID, Project, Tag, Task } from "@/types";

import { toProject, toTag, toTask } from "./refs";

/**
 * Realtime read subscriptions — the only place in the app that talks to
 * Firestore from the browser.
 *
 * No UI component may call `onSnapshot` directly; components go through the
 * hooks in `@/hooks`, which go through here. That keeps the "API-first" boundary
 * intact on the read side too: there is exactly one module to audit.
 *
 * Every query carries `where("userId", "==", uid)`. That is not merely a filter —
 * `firestore.rules` rejects any client query it cannot prove is owner-scoped, so
 * dropping it turns the subscription into a permission error rather than a data
 * leak. Isolation is enforced by the database, not by this file's good behaviour.
 *
 * Writes are impossible here: the rules deny every client write. Mutations go
 * through `@/lib/api-client` to `/api/v1`.
 */

export type SubscriptionHandlers<T> = {
  onData: (rows: T[]) => void;
  onError: (error: unknown) => void;
};

/**
 * Tasks, newest-touched first.
 *
 * One subscription per collection feeds every screen; filtering, sorting and all
 * dashboard statistics are derived from this array in memory. See D1 in the
 * plan for why, and `LIMITS.subscriptionMax` for the ceiling that makes it safe.
 *
 * Requires the `(userId ASC, updatedAt DESC)` composite index.
 */
export function subscribeTasks(
  uid: ID,
  { onData, onError }: SubscriptionHandlers<Task>,
): Unsubscribe {
  const tasksQuery = query(
    collection(getFirestoreDb(), "tasks"),
    where("userId", "==", uid),
    orderBy("updatedAt", "desc"),
    limit(LIMITS.subscriptionMax),
  );

  return onSnapshot(
    tasksQuery,
    (snapshot) => onData(snapshot.docs.map(toTask)),
    onError,
  );
}

/** Requires the `(userId ASC, name ASC)` composite index. */
export function subscribeProjects(
  uid: ID,
  { onData, onError }: SubscriptionHandlers<Project>,
): Unsubscribe {
  const projectsQuery = query(
    collection(getFirestoreDb(), "projects"),
    where("userId", "==", uid),
    orderBy("name", "asc"),
    limit(LIMITS.subscriptionMax),
  );

  return onSnapshot(
    projectsQuery,
    (snapshot) => onData(snapshot.docs.map(toProject)),
    onError,
  );
}

/** Requires the `(userId ASC, name ASC)` composite index. */
export function subscribeTags(
  uid: ID,
  { onData, onError }: SubscriptionHandlers<Tag>,
): Unsubscribe {
  const tagsQuery = query(
    collection(getFirestoreDb(), "tags"),
    where("userId", "==", uid),
    orderBy("name", "asc"),
    limit(LIMITS.subscriptionMax),
  );

  return onSnapshot(
    tagsQuery,
    (snapshot) => onData(snapshot.docs.map(toTag)),
    onError,
  );
}
