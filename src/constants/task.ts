import {
  TASK_DUE_FILTERS,
  TASK_PRIORITIES,
  TASK_SORT_FIELDS,
  TASK_STATUSES,
  type TaskDueFilter,
  type TaskPriority,
  type TaskSortField,
  type TaskStatus,
} from "@/types";

/** Mirrors the `variant` union of `@/components/ui/badge`. */
type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "outline"
  | "ghost";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "לביצוע",
  in_progress: "בתהליך",
  done: "הושלם",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
  urgent: "דחופה",
};

export const TASK_DUE_FILTER_LABELS: Record<TaskDueFilter, string> = {
  all: "כל התאריכים",
  today: "להיום",
  overdue: "באיחור",
  upcoming: "עתידיות",
  none: "ללא תאריך יעד",
};

export const TASK_SORT_LABELS: Record<TaskSortField, string> = {
  updatedAt: "עודכן לאחרונה",
  createdAt: "תאריך יצירה",
  dueDate: "תאריך יעד",
  priority: "עדיפות",
  title: "כותרת",
};

/**
 * Sort ranks. Priority and status are unions, not numbers, so comparing them
 * needs an explicit order — `'high' < 'low'` alphabetically would be nonsense.
 * Sorting happens in memory (see D1), so no denormalized rank column is stored.
 */
export const TASK_PRIORITY_RANK: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

export const TASK_STATUS_RANK: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 1,
  done: 2,
};

export const TASK_STATUS_BADGE: Record<TaskStatus, BadgeVariant> = {
  todo: "secondary",
  in_progress: "info",
  done: "success",
};

export const TASK_PRIORITY_BADGE: Record<TaskPriority, BadgeVariant> = {
  low: "ghost",
  medium: "secondary",
  high: "warning",
  urgent: "destructive",
};

/** A tinted left/right rail on the task card, keyed by priority. */
export const TASK_PRIORITY_ACCENT: Record<TaskPriority, string> = {
  low: "bg-border",
  medium: "bg-brand-sky-300",
  high: "bg-warning",
  urgent: "bg-destructive",
};

export const DEFAULT_TASK_STATUS: TaskStatus = "todo";
export const DEFAULT_TASK_PRIORITY: TaskPriority = "medium";

export {
  TASK_DUE_FILTERS,
  TASK_PRIORITIES,
  TASK_SORT_FIELDS,
  TASK_STATUSES,
};
