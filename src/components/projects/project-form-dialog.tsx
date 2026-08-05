"use client";

import {
  ColorPicker,
  FormField,
  SubmitButton,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/constants";
import { useCreateProject, useUpdateProject, useZodForm } from "@/hooks";
import { createProjectSchema, type CreateProjectInput } from "@/lib/schemas";
import type { ColorToken, Project } from "@/types";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}

/**
 * Create/edit dialog for a project.
 *
 * A duplicate name comes back from the server as `CONFLICT`, not a field error,
 * so it surfaces as a toast from the mutation hook rather than under the input.
 * The name is still the obvious culprit, and mapping a 409 into a synthetic
 * field error would mean inventing server semantics on the client.
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: ProjectFormDialogProps) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const isPending = createProject.isPending || updateProject.isPending;

  const form = useZodForm({
    schema: createProjectSchema,
    initialValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      color: project?.color ?? "sky",
    } as CreateProjectInput,
    onSubmit: async (values) => {
      if (project) {
        await updateProject.mutateAsync({ id: project.id, input: values });
      } else {
        await createProject.mutateAsync(values);
      }

      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? "עריכת פרויקט" : "פרויקט חדש"}</DialogTitle>
          <DialogDescription>
            פרויקטים עוזרים לקבץ משימות שקשורות זו לזו.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.submit} noValidate className="space-y-4">
          <FormField label="שם הפרויקט" error={form.errors.name} required>
            {(field) => (
              <Input
                {...field}
                autoFocus
                maxLength={LIMITS.project.nameMax}
                placeholder="לדוגמה: עבודה"
                value={form.values.name}
                onChange={(event) => form.setValue("name", event.target.value)}
              />
            )}
          </FormField>

          <FormField label="תיאור" error={form.errors.description}>
            {(field) => (
              <Textarea
                {...field}
                rows={2}
                maxLength={LIMITS.project.descriptionMax}
                placeholder="על מה הפרויקט הזה? (לא חובה)"
                value={form.values.description ?? ""}
                onChange={(event) =>
                  form.setValue("description", event.target.value)
                }
              />
            )}
          </FormField>

          <FormField label="צבע" error={form.errors.color}>
            {(field) => (
              <ColorPicker
                id={field.id}
                value={(form.values.color ?? "sky") as ColorToken}
                onChange={(color) => form.setValue("color", color)}
              />
            )}
          </FormField>

          {form.formError ? (
            <p role="alert" className="text-sm text-destructive">
              {form.formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              ביטול
            </Button>

            <SubmitButton
              variant="strong"
              isPending={isPending || form.isSubmitting}
              pendingLabel="שומר…"
            >
              {project ? "שמירת שינויים" : "יצירת פרויקט"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
