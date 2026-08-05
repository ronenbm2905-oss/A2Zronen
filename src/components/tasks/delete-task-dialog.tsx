"use client";

import { ConfirmDialog } from "@/components/common";
import { useDeleteTask } from "@/hooks";
import type { Task } from "@/types";

interface DeleteTaskDialogProps {
  task: Task | null;
  onClose: () => void;
  /**
   * Fired only after the server confirms the delete. The detail screen uses it
   * to navigate away, which must not happen when the user merely cancels.
   */
  onDeleted?: () => void;
}

/**
 * Confirm-and-delete for a task. Naming the task in the prompt is what makes the
 * confirmation meaningful rather than reflexive.
 */
export function DeleteTaskDialog({
  task,
  onClose,
  onDeleted,
}: DeleteTaskDialogProps) {
  const deleteTask = useDeleteTask();

  return (
    <ConfirmDialog
      open={task !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="מחיקת משימה"
      description={
        <>
          המשימה &rdquo;{task?.title}&ldquo; תימחק לצמיתות. לא ניתן לשחזר פעולה זו.
        </>
      }
      isPending={deleteTask.isPending}
      onConfirm={() => {
        if (!task) return;

        deleteTask.mutate(task.id, {
          onSuccess: () => {
            onClose();
            onDeleted?.();
          },
        });
      }}
    />
  );
}
