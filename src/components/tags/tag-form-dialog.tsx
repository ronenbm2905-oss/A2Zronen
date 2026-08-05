"use client";

import { ColorPicker, FormField, SubmitButton } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LIMITS } from "@/constants";
import { useCreateTag, useUpdateTag, useZodForm } from "@/hooks";
import { createTagSchema, type CreateTagInput } from "@/lib/schemas";
import type { ColorToken, Tag } from "@/types";

interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: Tag;
}

export function TagFormDialog({ open, onOpenChange, tag }: TagFormDialogProps) {
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();

  const isPending = createTag.isPending || updateTag.isPending;

  const form = useZodForm({
    schema: createTagSchema,
    initialValues: {
      name: tag?.name ?? "",
      color: tag?.color ?? "sky",
    } as CreateTagInput,
    onSubmit: async (values) => {
      if (tag) {
        await updateTag.mutateAsync({ id: tag.id, input: values });
      } else {
        await createTag.mutateAsync(values);
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
          <DialogTitle>{tag ? "עריכת תגית" : "תגית חדשה"}</DialogTitle>
          <DialogDescription>
            תגיות מאפשרות לסמן משימות בכמה חתכים במקביל.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.submit} noValidate className="space-y-4">
          <FormField label="שם התגית" error={form.errors.name} required>
            {(field) => (
              <Input
                {...field}
                autoFocus
                maxLength={LIMITS.tag.nameMax}
                placeholder="לדוגמה: דחוף"
                value={form.values.name}
                onChange={(event) => form.setValue("name", event.target.value)}
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
              {tag ? "שמירת שינויים" : "יצירת תגית"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
