"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagChip } from "@/components/tags/tag-chip";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_ACCENT,
  TASK_PRIORITY_LABELS,
} from "@/constants";
import { useLookups, useToggleTaskStatus, useUpdateTask } from "@/hooks";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/types";

import { ProjectBadge, TaskDueBadge, TaskPriorityBadge } from "./task-badges";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  /** Drops the description and the overflow menu, for dashboard lists. */
  compact?: boolean;
}

/**
 * A task in a list.
 *
 * The title is the only link, rather than the whole card: a card-wide link would
 * swallow clicks on the checkbox and the menu, and nesting interactive elements
 * inside an anchor is invalid HTML that screen readers announce incoherently.
 *
 * The status checkbox mutates optimistically, so it responds instantly — this is
 * the highest-traffic action in the app and any latency in it is felt.
 */
export function TaskCard({ task, onEdit, onDelete, compact = false }: TaskCardProps) {
  const { projectsById, tagsById } = useLookups();
  const { toggle } = useToggleTaskStatus();
  const updateTask = useUpdateTask();

  const isDone = task.status === "done";
  const project = task.projectId ? projectsById.get(task.projectId) : undefined;
  const tags = task.tagIds
    .map((tagId) => tagsById.get(tagId))
    .filter((tag) => tag !== undefined);

  return (
    <article
      className={cn(
        "group relative flex gap-3 overflow-hidden rounded-xl border border-border bg-card ps-4 transition-colors hover:border-primary/30",
        compact ? "p-3 ps-4" : "p-4 ps-5",
      )}
    >
      {/* Priority rail on the inline-start edge — a colour cue that survives
          scanning a long list without reading each badge. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 start-0 w-1",
          TASK_PRIORITY_ACCENT[task.priority],
        )}
      />

      <Checkbox
        checked={isDone}
        onCheckedChange={() => toggle(task)}
        aria-label={isDone ? `סימון "${task.title}" כלא הושלמה` : `סימון "${task.title}" כהושלמה`}
        className="mt-1"
      />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/tasks/${task.id}`}
            className={cn(
              "font-medium leading-snug hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isDone && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </Link>

          {!compact ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`פעולות עבור "${task.title}"`}
                    className="shrink-0"
                  >
                    <MoreHorizontal aria-hidden />
                  </Button>
                }
              />

              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Pencil aria-hidden />
                  עריכה
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>עדיפות</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={task.priority}
                  onValueChange={(value) =>
                    updateTask.mutate({
                      id: task.id,
                      input: { priority: value as TaskPriority },
                    })
                  }
                >
                  {TASK_PRIORITIES.map((priority) => (
                    <DropdownMenuRadioItem key={priority} value={priority}>
                      {TASK_PRIORITY_LABELS[priority]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
                  <Trash2 aria-hidden />
                  מחיקה
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {!compact && task.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {task.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <TaskPriorityBadge priority={task.priority} />
          <TaskDueBadge task={task} />
          {project ? <ProjectBadge project={project} /> : null}
          {tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
        </div>
      </div>
    </article>
  );
}
