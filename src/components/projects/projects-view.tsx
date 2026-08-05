"use client";

import { FolderKanban, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { useDeleteProject, useProjects, useTasks } from "@/hooks";
import type { Project } from "@/types";

import { ProjectCard } from "./project-card";
import { ProjectFormDialog } from "./project-form-dialog";

/**
 * The projects grid.
 *
 * Task counts are computed from the tasks subscription rather than fetched, so
 * they stay correct the moment a task is created, reassigned or deleted — and
 * the delete confirmation can state exactly how many tasks it will detach.
 */
export function ProjectsView() {
  const { data, isLoading, isError, error } = useProjects();
  const { data: taskData } = useTasks();
  const deleteProject = useDeleteProject();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const projects = useMemo(() => data ?? [], [data]);
  const tasks = useMemo(() => taskData ?? [], [taskData]);

  const counts = useMemo(() => {
    const map = new Map<string, { total: number; open: number }>();

    for (const task of tasks) {
      if (!task.projectId) continue;

      const entry = map.get(task.projectId) ?? { total: 0, open: 0 };
      entry.total += 1;
      if (task.status !== "done") entry.open += 1;
      map.set(task.projectId, entry);
    }

    return map;
  }, [tasks]);

  const deletingCount = deleting ? (counts.get(deleting.id)?.total ?? 0) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="פרויקטים"
        description="ארגן משימות לפי תחומים."
        actions={
          <Button variant="strong" onClick={() => setIsCreateOpen(true)}>
            <Plus data-icon="inline-start" aria-hidden />
            פרויקט חדש
          </Button>
        }
      />

      {isError ? <ErrorState error={error} /> : null}
      {isLoading ? <LoadingState variant="grid" count={3} /> : null}

      {!isLoading && !isError && projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="אין עדיין פרויקטים"
          description="צור פרויקט כדי לקבץ משימות שקשורות זו לזו."
          action={
            <Button variant="strong" onClick={() => setIsCreateOpen(true)}>
              יצירת פרויקט
            </Button>
          }
        />
      ) : null}

      {projects.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const entry = counts.get(project.id) ?? { total: 0, open: 0 };

            return (
              <li key={project.id}>
                <ProjectCard
                  project={project}
                  openCount={entry.open}
                  totalCount={entry.total}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                />
              </li>
            );
          })}
        </ul>
      ) : null}

      <ProjectFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      <ProjectFormDialog
        key={editing?.id ?? "edit"}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        project={editing ?? undefined}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="מחיקת פרויקט"
        description={
          <>
            הפרויקט &rdquo;{deleting?.name}&ldquo; יימחק.{" "}
            {deletingCount > 0
              ? `${deletingCount} המשימות שלו לא יימחקו — הן יעברו ל"ללא פרויקט".`
              : "אין משימות המשויכות לפרויקט הזה."}
          </>
        }
        isPending={deleteProject.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteProject.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
          });
        }}
      />
    </div>
  );
}
