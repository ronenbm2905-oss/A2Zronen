import type { ID, ISODateString, Nullable } from "./common";

/**
 * Status and priority values are English snake_case on purpose: they are stored
 * in Firestore, appear in URL query params, and are indexed. Hebrew is a
 * presentation concern and lives in `@/constants/task` as label maps.
 */
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/**
 * A task as it crosses every boundary above the service layer: API responses,
 * React state, forms.
 *
 * Note the timestamps are `ISODateString`, never a Firestore `Timestamp` —
 * that class differs between `firebase-admin/firestore` and `firebase/firestore`,
 * and letting it leak would give this interface two incompatible shapes.
 * `@/lib/firebase/converters` performs the mapping on both read paths.
 */
export interface Task {
  id: ID;
  userId: ID;
  title: string;
  /** `""` when empty — never `null`, which keeps diffing and rules simple. */
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Instant of local midnight on the due day. See `@/utils/date`. */
  dueDate: Nullable<ISODateString>;
  projectId: Nullable<ID>;
  tagIds: ID[];
  /** Set server-side when status becomes `done`, cleared when it leaves. */
  completedAt: Nullable<ISODateString>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Presets for the due-date filter, resolved against "today" at query time. */
export const TASK_DUE_FILTERS = [
  "all",
  "today",
  "overdue",
  "upcoming",
  "none",
] as const;
export type TaskDueFilter = (typeof TASK_DUE_FILTERS)[number];

export const TASK_SORT_FIELDS = [
  "updatedAt",
  "createdAt",
  "dueDate",
  "priority",
  "title",
] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

export type SortDirection = "asc" | "desc";

/**
 * The full filter/sort state of the tasks screen. It round-trips through the
 * URL search params, so every field must be representable as a string.
 */
export interface TaskFilter {
  search: string;
  status: TaskStatus[];
  priority: TaskPriority[];
  projectId: Nullable<ID>;
  tagIds: ID[];
  due: TaskDueFilter;
  sort: TaskSortField;
  direction: SortDirection;
}
