"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { TASK_PRIORITY_RANK } from "@/constants";
import type {
  SortDirection,
  Task,
  TaskDueFilter,
  TaskFilter,
  TaskPriority,
  TaskSortField,
  TaskStatus,
} from "@/types";
import { isPastDue, isToday, isUpcoming } from "@/utils";

/**
 * Filter and sort state for the tasks screen, stored in the URL.
 *
 * The URL is the single source of truth rather than component state, which buys
 * three things for free: a filtered view survives a reload, it is shareable and
 * bookmarkable, and the browser's back button steps through filter changes the
 * way users expect.
 *
 * Filtering and sorting run in memory over the realtime array (D1), so changes
 * are instant and cost no reads.
 *
 * Any component calling this hook must sit inside a `<Suspense>` boundary —
 * `useSearchParams` opts the route into client rendering, and without one the
 * production build fails.
 */

export const DEFAULT_TASK_FILTER: TaskFilter = {
  search: "",
  status: [],
  priority: [],
  projectId: null,
  tagIds: [],
  due: "all",
  sort: "updatedAt",
  direction: "desc",
};

function readCsv(raw: string | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function readEnumParam<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export function useTaskFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = useMemo<TaskFilter>(() => {
    return {
      search: searchParams.get("q") ?? "",
      status: readCsv(searchParams.get("status")) as TaskStatus[],
      priority: readCsv(searchParams.get("priority")) as TaskPriority[],
      projectId: searchParams.get("project") || null,
      tagIds: readCsv(searchParams.get("tags")),
      due: readEnumParam<TaskDueFilter>(
        searchParams.get("due"),
        ["all", "today", "overdue", "upcoming", "none"],
        "all",
      ),
      sort: readEnumParam<TaskSortField>(
        searchParams.get("sort"),
        ["updatedAt", "createdAt", "dueDate", "priority", "title"],
        "updatedAt",
      ),
      direction: readEnumParam<SortDirection>(
        searchParams.get("dir"),
        ["asc", "desc"],
        "desc",
      ),
    };
  }, [searchParams]);

  const apply = useCallback(
    (patch: Partial<TaskFilter>) => {
      const next = { ...filter, ...patch };
      const params = new URLSearchParams();

      // Only non-default values are written, so a pristine view has a clean URL
      // and "is anything filtered?" is just `params.size > 0`.
      if (next.search) params.set("q", next.search);
      if (next.status.length) params.set("status", next.status.join(","));
      if (next.priority.length) params.set("priority", next.priority.join(","));
      if (next.projectId) params.set("project", next.projectId);
      if (next.tagIds.length) params.set("tags", next.tagIds.join(","));
      if (next.due !== "all") params.set("due", next.due);
      if (next.sort !== "updatedAt") params.set("sort", next.sort);
      if (next.direction !== "desc") params.set("dir", next.direction);

      const query = params.toString();

      // `scroll: false` keeps the list from jumping to the top on every
      // checkbox toggle.
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filter, pathname, router],
  );

  const clear = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  /** Add or remove one value from a multi-select facet. */
  const toggleInList = useCallback(
    <K extends "status" | "priority" | "tagIds">(key: K, value: string) => {
      const current = filter[key] as string[];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      apply({ [key]: next } as unknown as Partial<TaskFilter>);
    },
    [apply, filter],
  );

  const activeCount = useMemo(() => {
    let count = 0;
    if (filter.search) count += 1;
    if (filter.status.length) count += 1;
    if (filter.priority.length) count += 1;
    if (filter.projectId) count += 1;
    if (filter.tagIds.length) count += 1;
    if (filter.due !== "all") count += 1;
    return count;
  }, [filter]);

  return { filter, apply, clear, toggleInList, activeCount };
}

function matchesDue(task: Task, due: TaskDueFilter): boolean {
  switch (due) {
    case "today":
      return isToday(task.dueDate);
    case "overdue":
      // A finished task is never "late" — it is done.
      return isPastDue(task.dueDate) && task.status !== "done";
    case "upcoming":
      return isUpcoming(task.dueDate);
    case "none":
      return task.dueDate === null;
    default:
      return true;
  }
}

function compare(a: Task, b: Task, field: TaskSortField): number {
  switch (field) {
    case "title":
      return a.title.localeCompare(b.title, "he");
    case "priority":
      return TASK_PRIORITY_RANK[a.priority] - TASK_PRIORITY_RANK[b.priority];
    case "dueDate": {
      // Tasks with no due date sort last in either direction: "no deadline" is
      // not the same as "due at the beginning of time".
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    default:
      return a[field].localeCompare(b[field]);
  }
}

/** Apply a filter and sort to the realtime task array. Pure; safe in `useMemo`. */
export function selectTasks(tasks: Task[], filter: TaskFilter): Task[] {
  const needle = filter.search.trim().toLocaleLowerCase();

  const filtered = tasks.filter((task) => {
    if (filter.status.length && !filter.status.includes(task.status)) return false;
    if (filter.priority.length && !filter.priority.includes(task.priority)) {
      return false;
    }
    if (filter.projectId && task.projectId !== filter.projectId) return false;

    // Multiple tags narrow the result: a task must carry all of them.
    if (
      filter.tagIds.length &&
      !filter.tagIds.every((tagId) => task.tagIds.includes(tagId))
    ) {
      return false;
    }

    if (!matchesDue(task, filter.due)) return false;

    if (
      needle &&
      !task.title.toLocaleLowerCase().includes(needle) &&
      !task.description.toLocaleLowerCase().includes(needle)
    ) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => compare(a, b, filter.sort));

  // `dueDate` keeps its nulls-last placement regardless of direction, so the
  // reversal is applied to the comparison rather than the whole array.
  if (filter.direction === "desc") {
    if (filter.sort === "dueDate") {
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return b.dueDate.localeCompare(a.dueDate);
      });
    }
    return sorted.reverse();
  }

  return sorted;
}
