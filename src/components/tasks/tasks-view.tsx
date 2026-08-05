"use client";

import { ListTodo, Plus, SearchX } from "lucide-react";
import { useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { selectTasks, useTaskFilters, useTasks } from "@/hooks";
import type { Task } from "@/types";

import { DeleteTaskDialog } from "./delete-task-dialog";
import { TaskCard } from "./task-card";
import { TaskFilterBar } from "./task-filter-bar";
import { TaskFormDialog } from "./task-form-dialog";

/**
 * The full task list.
 *
 * Filtering and sorting run in memory over the live array, so both are instant
 * and cost no reads. The two empty states are kept distinct on purpose: "you
 * have no tasks" invites you to create one, while "no tasks match this filter"
 * offers to clear the filter — offering the wrong one is how a user concludes
 * their data is gone.
 *
 * Reads `useSearchParams` through `useTaskFilters`, so the page must wrap this
 * in `<Suspense>`.
 */
export function TasksView() {
  const { data, isLoading, isError, error } = useTasks();
  const { filter, clear, activeCount } = useTaskFilters();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const tasks = useMemo(() => data ?? [], [data]);
  const visible = useMemo(() => selectTasks(tasks, filter), [tasks, filter]);

  const hasNoTasksAtAll = !isLoading && !isError && tasks.length === 0;
  const hasNoMatches = !isLoading && !isError && tasks.length > 0 && visible.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="כל המשימות"
        description={
          isLoading ? undefined : `${visible.length} מתוך ${tasks.length} משימות`
        }
        actions={
          <Button variant="strong" onClick={() => setIsCreateOpen(true)}>
            <Plus data-icon="inline-start" aria-hidden />
            משימה חדשה
          </Button>
        }
      />

      {!hasNoTasksAtAll ? <TaskFilterBar /> : null}

      {isError ? <ErrorState error={error} /> : null}
      {isLoading ? <LoadingState variant="list" count={5} /> : null}

      {hasNoTasksAtAll ? (
        <EmptyState
          icon={ListTodo}
          title="אין עדיין משימות"
          description="צור את המשימה הראשונה שלך כדי להתחיל."
          action={
            <Button variant="strong" onClick={() => setIsCreateOpen(true)}>
              יצירת משימה
            </Button>
          }
        />
      ) : null}

      {hasNoMatches ? (
        <EmptyState
          icon={SearchX}
          title="אין משימות שתואמות לסינון"
          description="נסה לשנות את הסינון או לנקות אותו כדי לראות את כל המשימות."
          action={
            activeCount > 0 ? (
              <Button variant="outline" onClick={clear}>
                ניקוי הסינון
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {visible.length > 0 ? (
        <ul className="space-y-3">
          {visible.map((task) => (
            <li key={task.id}>
              <TaskCard task={task} onEdit={setEditing} onDelete={setDeleting} />
            </li>
          ))}
        </ul>
      ) : null}

      <TaskFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultProjectId={filter.projectId}
      />

      <TaskFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        task={editing ?? undefined}
      />

      <DeleteTaskDialog task={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
