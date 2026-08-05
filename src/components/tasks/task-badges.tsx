"use client";

import { CalendarClock } from "lucide-react";

import { ColorDot } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import {
  TASK_PRIORITY_BADGE,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_BADGE,
  TASK_STATUS_LABELS,
} from "@/constants";
import { cn } from "@/lib/utils";
import type { Project, Task, TaskPriority, TaskStatus } from "@/types";
import { formatRelativeHe, isPastDue, isToday } from "@/utils";

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={TASK_STATUS_BADGE[status]}>{TASK_STATUS_LABELS[status]}</Badge>;
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant={TASK_PRIORITY_BADGE[priority]}>
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  );
}

/**
 * The due date, coloured by urgency.
 *
 * A finished task never reads as overdue — once it is done, when it was due is
 * history rather than a warning.
 *
 * Client-side only: `formatRelativeHe` uses `Intl` against the local timezone,
 * which would produce a hydration mismatch if rendered on the server.
 */
export function TaskDueBadge({ task }: { task: Task }) {
  if (!task.dueDate) return null;

  const isDone = task.status === "done";
  const overdue = !isDone && isPastDue(task.dueDate);
  const today = !isDone && isToday(task.dueDate);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        overdue && "font-medium text-destructive",
        today && "font-medium text-warning",
        !overdue && !today && "text-muted-foreground",
      )}
    >
      <CalendarClock className="size-3.5" aria-hidden />
      {overdue ? "באיחור · " : null}
      {formatRelativeHe(task.dueDate)}
    </span>
  );
}

export function ProjectBadge({ project }: { project: Project }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <ColorDot color={project.color} />
      {project.name}
    </span>
  );
}
