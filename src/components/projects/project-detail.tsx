"use client";

import { ArrowRight, ListTodo, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ButtonLink,
  ColorDot,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import { useProject, useTasks } from "@/hooks";
import type { ID, Project, Task } from "@/types";

import { ProjectFormDialog } from "./project-form-dialog";

/**
 * A project and the tasks assigned to it.
 *
 * Both come from the live collections, so a task reassigned elsewhere leaves
 * this list on its own — no refetch, no manual invalidation.
 */
export function ProjectDetail({ projectId }: { projectId: ID }) {
  const {
    data: project,
    isLoading,
    isError,
    error,
    notFound,
  } = useProject(projectId);
  const { data: taskData, isLoading: tasksLoading } = useTasks();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const tasks = useMemo(
    () => (taskData ?? []).filter((task) => task.projectId === projectId),
    [taskData, projectId],
  );

  if (isLoading) return <LoadingState variant="detail" />;
  if (isError) return <ErrorState error={error} />;

  if (notFound || !project) {
    return (
      <div className="space-y-4">
        <ErrorState error={null} title="הפרויקט לא נמצא" />
        <div className="flex justify-center">
          <ButtonLink variant="outline" href="/projects">
            <ArrowRight data-icon="inline-start" aria-hidden />
            חזרה לפרויקטים
          </ButtonLink>
        </div>
      </div>
    );
  }

  const openCount = tasks.filter((task) => task.status !== "done").length;

  return (
    <div className="space-y-6">
      <ButtonLink variant="ghost" size="sm" href="/projects">
        <ArrowRight data-icon="inline-start" aria-hidden />
        חזרה לפרויקטים
      </ButtonLink>

      <ProjectHeader
        project={project}
        openCount={openCount}
        totalCount={tasks.length}
        onEdit={() => setIsEditOpen(true)}
        onCreateTask={() => setIsCreateOpen(true)}
      />

      {tasksLoading ? <LoadingState variant="list" count={3} /> : null}

      {!tasksLoading && tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="אין משימות בפרויקט הזה"
          description="הוסף משימה ראשונה כדי להתחיל לעבוד עליו."
          action={
            <Button variant="strong" onClick={() => setIsCreateOpen(true)}>
              הוספת משימה
            </Button>
          }
        />
      ) : null}

      {tasks.length > 0 ? (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                onEdit={setEditingTask}
                onDelete={setDeletingTask}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <ProjectFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        project={project}
      />

      <TaskFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultProjectId={project.id}
      />

      <TaskFormDialog
        open={editingTask !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        task={editingTask ?? undefined}
      />

      <DeleteTaskDialog
        task={deletingTask}
        onClose={() => setDeletingTask(null)}
      />
    </div>
  );
}

interface ProjectHeaderProps {
  project: Project;
  openCount: number;
  totalCount: number;
  onEdit: () => void;
  onCreateTask: () => void;
}

function ProjectHeader({
  project,
  openCount,
  totalCount,
  onEdit,
  onCreateTask,
}: ProjectHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="flex items-center gap-2 text-2xl leading-heading sm:text-display-sm">
          <ColorDot color={project.color} className="size-3" />
          {project.name}
        </h1>

        {project.description ? (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? "אין משימות"
            : `${openCount} פתוחות מתוך ${totalCount} משימות`}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil data-icon="inline-start" aria-hidden />
          עריכה
        </Button>
        <Button variant="strong" size="sm" onClick={onCreateTask}>
          <Plus data-icon="inline-start" aria-hidden />
          משימה חדשה
        </Button>
      </div>
    </div>
  );
}
