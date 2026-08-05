"use client";

import { useMemo } from "react";

import type { Task, TaskPriority, TaskStatus } from "@/types";
import { countBy, isPastDue, isToday } from "@/utils";

import { useTasks } from "./use-collections";

/**
 * Every dashboard figure, derived in one pass over the realtime task array.
 *
 * Because the source is the same live array the rest of the app reads, the
 * counters move the moment a task changes anywhere — including from another
 * tab or device — with no refetch and no polling. That is the whole point of
 * the single-subscription design (D1).
 */

export interface DashboardStats {
  total: number;
  open: number;
  completed: number;
  dueToday: number;
  overdue: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  /** Tasks due today, soonest first — the "what now" list. */
  todayTasks: Task[];
  /** Overdue and unfinished, most overdue first. */
  overdueTasks: Task[];
  /** Most recently touched, capped for display. */
  recentTasks: Task[];
  completionRate: number;
}

const EMPTY_STATUS: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 0,
  done: 0,
};

const EMPTY_PRIORITY: Record<TaskPriority, number> = {
  low: 0,
  medium: 0,
  high: 0,
  urgent: 0,
};

const RECENT_LIMIT = 5;
const LIST_LIMIT = 5;

export function useDashboardStats() {
  const query = useTasks();
  const tasks = useMemo(() => query.data ?? [], [query.data]);

  const stats = useMemo<DashboardStats>(() => {
    const open = tasks.filter((task) => task.status !== "done");
    const completed = tasks.filter((task) => task.status === "done");

    // "Overdue" is measured against open tasks only: a task finished after its
    // due date is late history, not outstanding work.
    const overdueTasks = open
      .filter((task) => isPastDue(task.dueDate))
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

    const todayTasks = open
      .filter((task) => isToday(task.dueDate))
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

    return {
      total: tasks.length,
      open: open.length,
      completed: completed.length,
      dueToday: todayTasks.length,
      overdue: overdueTasks.length,
      byStatus: { ...EMPTY_STATUS, ...countBy(tasks, (task) => task.status) },
      byPriority: {
        ...EMPTY_PRIORITY,
        // Breakdowns cover open work: a chart dominated by finished urgent
        // tasks says nothing about what needs attention.
        ...countBy(open, (task) => task.priority),
      },
      todayTasks: todayTasks.slice(0, LIST_LIMIT),
      overdueTasks: overdueTasks.slice(0, LIST_LIMIT),
      // `tasks` already arrives ordered by `updatedAt desc` from Firestore.
      recentTasks: tasks.slice(0, RECENT_LIMIT),
      completionRate:
        tasks.length === 0
          ? 0
          : Math.round((completed.length / tasks.length) * 100),
    };
  }, [tasks]);

  return {
    stats,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: !query.isLoading && !query.isError && tasks.length === 0,
  };
}
