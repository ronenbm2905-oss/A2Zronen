"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateTask, useUpdateTask } from "@/hooks";
import type { CreateTaskInput } from "@/lib/schemas";
import type { ID, Task } from "@/types";

import { TaskForm } from "./task-form";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present to edit an existing task; absent to create a new one. */
  task?: Task;
  defaultProjectId?: ID | null;
}

/**
 * Create/edit dialog around `TaskForm`.
 *
 * It closes only after the server confirms. Creation is deliberately not
 * optimistic — the realtime snapshot replaces the whole array, so a fabricated
 * row would flicker or briefly double up — which makes the pending submit button
 * the honest signal that work is in flight.
 *
 * The form is keyed on the task id so reopening the dialog for a different task
 * remounts it with fresh initial values instead of showing the previous one's.
 */
export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultProjectId = null,
}: TaskFormDialogProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const isPending = createTask.isPending || updateTask.isPending;

  const handleSubmit = async (values: CreateTaskInput) => {
    if (task) {
      await updateTask.mutateAsync({ id: task.id, input: values });
    } else {
      await createTask.mutateAsync(values);
    }

    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "עריכת משימה" : "משימה חדשה"}</DialogTitle>
          <DialogDescription>
            {task
              ? "עדכן את פרטי המשימה ושמור."
              : "מלא את הפרטים כדי להוסיף משימה חדשה."}
          </DialogDescription>
        </DialogHeader>

        <TaskForm
          key={task?.id ?? "new"}
          task={task}
          defaultProjectId={defaultProjectId}
          isPending={isPending}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
