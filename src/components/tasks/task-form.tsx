"use client";

import { FormField, SelectField, SubmitButton } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  LIMITS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
} from "@/constants";
import { useLookups, useZodForm } from "@/hooks";
import { createTaskSchema, type CreateTaskInput } from "@/lib/schemas";
import type { Task } from "@/types";
import { fromDateInputValue, toDateInputValue } from "@/utils";

import { TaskTagPicker } from "./task-tag-picker";

const NO_PROJECT = "__none__";

interface TaskFormProps {
  /** Present in edit mode; absent when creating. */
  task?: Task;
  /** Pre-selected project, used when creating from a project's page. */
  defaultProjectId?: string | null;
  isPending: boolean;
  onSubmit: (values: CreateTaskInput) => Promise<unknown> | unknown;
  onCancel?: () => void;
}

/**
 * One form, two modes. The create and edit paths differ only in their initial
 * values and their submit label, so keeping them in a single component is what
 * guarantees the two stay in step as fields are added.
 *
 * It validates against `createTaskSchema` — the same schema the API uses — in
 * both modes. Edit submits the full object rather than a diff; the server's
 * `updateTaskSchema` accepts every field, and sending the whole thing avoids a
 * class of bug where an untouched field is silently dropped from the patch.
 */
export function TaskForm({
  task,
  defaultProjectId = null,
  isPending,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const { projects, tags } = useLookups();

  const form = useZodForm({
    schema: createTaskSchema,
    initialValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? "todo",
      priority: task?.priority ?? "medium",
      dueDate: task?.dueDate ?? null,
      projectId: task?.projectId ?? defaultProjectId,
      tagIds: task?.tagIds ?? [],
    } as CreateTaskInput,
    onSubmit,
  });

  const toggleTag = (tagId: string) => {
    const current = form.values.tagIds ?? [];
    form.setValue(
      "tagIds",
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  };

  return (
    <form onSubmit={form.submit} noValidate className="space-y-4">
      <FormField label="כותרת" error={form.errors.title} required>
        {(field) => (
          <Input
            {...field}
            autoFocus
            maxLength={LIMITS.task.titleMax}
            placeholder="מה צריך לעשות?"
            value={form.values.title}
            onChange={(event) => form.setValue("title", event.target.value)}
          />
        )}
      </FormField>

      <FormField label="תיאור" error={form.errors.description}>
        {(field) => (
          <Textarea
            {...field}
            rows={3}
            maxLength={LIMITS.task.descriptionMax}
            placeholder="פרטים נוספים (לא חובה)"
            value={form.values.description ?? ""}
            onChange={(event) => form.setValue("description", event.target.value)}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="סטטוס" error={form.errors.status}>
          {(field) => (
            <SelectField
              {...field}
              value={form.values.status ?? "todo"}
              onChange={(value) =>
                form.setValue("status", value as CreateTaskInput["status"])
              }
              options={TASK_STATUSES.map((status) => ({
                value: status,
                label: TASK_STATUS_LABELS[status],
              }))}
            />
          )}
        </FormField>

        <FormField label="עדיפות" error={form.errors.priority}>
          {(field) => (
            <SelectField
              {...field}
              value={form.values.priority ?? "medium"}
              onChange={(value) =>
                form.setValue("priority", value as CreateTaskInput["priority"])
              }
              options={TASK_PRIORITIES.map((priority) => ({
                value: priority,
                label: TASK_PRIORITY_LABELS[priority],
              }))}
            />
          )}
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="תאריך יעד" error={form.errors.dueDate}>
          {(field) => (
            <Input
              {...field}
              // Native date input: no dependency, a real picker on mobile, and
              // `he-IL` formatting for free. Base UI ships no calendar.
              type="date"
              value={toDateInputValue(form.values.dueDate)}
              onChange={(event) =>
                form.setValue("dueDate", fromDateInputValue(event.target.value))
              }
            />
          )}
        </FormField>

        <FormField label="פרויקט" error={form.errors.projectId}>
          {(field) => (
            <SelectField
              {...field}
              value={form.values.projectId ?? NO_PROJECT}
              onChange={(value) =>
                form.setValue("projectId", value === NO_PROJECT ? null : value)
              }
              options={[
                { value: NO_PROJECT, label: "ללא פרויקט" },
                ...projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                })),
              ]}
            />
          )}
        </FormField>
      </div>

      <FormField label="תגיות" error={form.errors.tagIds}>
        {(field) => (
          <TaskTagPicker
            id={field.id}
            tags={tags}
            selected={form.values.tagIds ?? []}
            onToggle={toggleTag}
          />
        )}
      </FormField>

      {form.formError ? (
        <p role="alert" className="text-sm text-destructive">
          {form.formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            ביטול
          </Button>
        ) : null}

        <SubmitButton
          variant="strong"
          isPending={isPending || form.isSubmitting}
          pendingLabel="שומר…"
        >
          {task ? "שמירת שינויים" : "יצירת משימה"}
        </SubmitButton>
      </div>
    </form>
  );
}
