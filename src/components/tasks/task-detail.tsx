"use client";

import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ButtonLink,
  ErrorState,
  LoadingState,
  SelectField,
} from "@/components/common";
import { TagChip } from "@/components/tags/tag-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
} from "@/constants";
import { useLookups, useTask, useUpdateTask } from "@/hooks";
import type { ID, TaskPriority, TaskStatus } from "@/types";
import { formatDateTimeHe } from "@/utils";

import { ProjectBadge, TaskDueBadge } from "./task-badges";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { TaskFormDialog } from "./task-form-dialog";

/**
 * A single task.
 *
 * It reads from the same live collection the list uses rather than fetching
 * `GET /api/v1/tasks/[id]`. The task is already cached and already subscribed,
 * so this view stays realtime and costs no extra round-trip — and an edit made
 * in another tab appears here immediately.
 *
 * Status and priority are inline selects: on a detail screen, changing them is
 * the most likely reason to be here, and routing that through the edit dialog
 * would add two clicks to the common case.
 */
export function TaskDetail({ taskId }: { taskId: ID }) {
  const { data: task, isLoading, isError, error, notFound } = useTask(taskId);
  const { projectsById, tagsById } = useLookups();
  const updateTask = useUpdateTask();
  const router = useRouter();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  if (isLoading) return <LoadingState variant="detail" />;
  if (isError) return <ErrorState error={error} />;

  if (notFound || !task) {
    return (
      <div className="space-y-4">
        <ErrorState
          error={null}
          title="המשימה לא נמצאה"
        />
        <div className="flex justify-center">
          <ButtonLink variant="outline" href="/tasks">
            <ArrowRight data-icon="inline-start" aria-hidden />
            חזרה לכל המשימות
          </ButtonLink>
        </div>
      </div>
    );
  }

  const project = task.projectId ? projectsById.get(task.projectId) : undefined;
  const tags = task.tagIds
    .map((tagId) => tagsById.get(tagId))
    .filter((tag) => tag !== undefined);

  return (
    <div className="space-y-6">
      <ButtonLink variant="ghost" size="sm" href="/tasks">
        <ArrowRight data-icon="inline-start" aria-hidden />
        חזרה לכל המשימות
      </ButtonLink>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl leading-heading sm:text-display-sm">{task.title}</h1>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <Pencil data-icon="inline-start" aria-hidden />
            עריכה
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 data-icon="inline-start" aria-hidden />
            מחיקה
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>תיאור</CardTitle>
          </CardHeader>
          <CardContent>
            {task.description ? (
              <p className="whitespace-pre-wrap text-sm leading-body">
                {task.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">לא נוסף תיאור למשימה.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>פרטים</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Field label="סטטוס">
              <SelectField
                value={task.status}
                onChange={(value) =>
                  updateTask.mutate({
                    id: task.id,
                    input: { status: value as TaskStatus },
                  })
                }
                options={TASK_STATUSES.map((status) => ({
                  value: status,
                  label: TASK_STATUS_LABELS[status],
                }))}
              />
            </Field>

            <Field label="עדיפות">
              <SelectField
                value={task.priority}
                onChange={(value) =>
                  updateTask.mutate({
                    id: task.id,
                    input: { priority: value as TaskPriority },
                  })
                }
                options={TASK_PRIORITIES.map((priority) => ({
                  value: priority,
                  label: TASK_PRIORITY_LABELS[priority],
                }))}
              />
            </Field>

            <Separator />

            <Field label="תאריך יעד">
              {task.dueDate ? (
                <TaskDueBadge task={task} />
              ) : (
                <span className="text-sm text-muted-foreground">לא נקבע</span>
              )}
            </Field>

            <Field label="פרויקט">
              {project ? (
                <Link
                  href={`/projects/${project.id}`}
                  className="hover:underline underline-offset-4"
                >
                  <ProjectBadge project={project} />
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">ללא פרויקט</span>
              )}
            </Field>

            <Field label="תגיות">
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <TagChip key={tag.id} tag={tag} />
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">ללא תגיות</span>
              )}
            </Field>

            <Separator />

            <Field label="נוצרה">
              <span className="text-sm text-muted-foreground">
                {formatDateTimeHe(task.createdAt)}
              </span>
            </Field>

            <Field label="עודכנה">
              <span className="text-sm text-muted-foreground">
                {formatDateTimeHe(task.updatedAt)}
              </span>
            </Field>

            {task.completedAt ? (
              <Field label="הושלמה">
                <span className="text-sm text-success">
                  {formatDateTimeHe(task.completedAt)}
                </span>
              </Field>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <TaskFormDialog open={isEditOpen} onOpenChange={setIsEditOpen} task={task} />

      <DeleteTaskDialog
        task={isDeleteOpen ? task : null}
        onClose={() => setIsDeleteOpen(false)}
        // Only after a confirmed delete: the task no longer exists, so this view
        // would otherwise fall through to its not-found branch.
        onDeleted={() => router.replace("/tasks")}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
