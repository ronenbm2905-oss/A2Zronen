"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { endpoints } from "@/lib/api-client";
import { toHebrewMessage } from "@/lib/errors/messages.he";
import { queryKeys } from "@/lib/query/keys";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/schemas";
import { toast } from "@/lib/toast";
import type { ID, Task, TaskPriority, TaskStatus } from "@/types";

import { useApiFetch, useAuth } from "./use-auth";

/**
 * Task mutations: POST/PATCH/DELETE to `/api/v1`, with the realtime subscription
 * delivering the authoritative row a moment later.
 *
 * Three things this pattern gets right that a direct port of the React Query
 * optimistic-update recipe would not:
 *
 * 1. **No `cancelQueries` in `onMutate`.** The canonical recipe opens with it,
 *    but here the only in-flight promise is the *initial snapshot* awaited by
 *    `useRealtimeCollection`. Cancelling that would strand the query in loading.
 *
 * 2. **No `invalidateQueries` anywhere.** Firestore pushes the truth; there is
 *    nothing to refetch. The only cache-wide operation in the app is
 *    `queryClient.clear()` on sign-out.
 *
 * 3. **The `onError` rollback is mandatory, not a nicety.** With a normal query
 *    you could argue a refetch will fix a bad optimistic patch. Here a *failed*
 *    server write produces no snapshot at all — so without the rollback the
 *    patch would sit on screen indefinitely, showing a change that never
 *    happened.
 */

type TaskListContext = { previous: Task[] | undefined };

function useTasksKey() {
  const { user } = useAuth();
  return queryKeys.tasks(user?.uid ?? "anonymous");
}

export function useCreateTask() {
  const apiFetch = useApiFetch();

  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      apiFetch<Task>(endpoints.tasks(), { method: "POST", body: input }),
    // Not optimistic: a fabricated id would either flicker or briefly double up
    // when the snapshot replaces the array wholesale. The dialog shows a pending
    // button and closes on success; the new row slides in ~200ms later.
    onSuccess: () => toast.success("המשימה נוצרה."),
    onError: (error) => toast.error(toHebrewMessage(error)),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const apiFetch = useApiFetch();
  const key = useTasksKey();

  return useMutation<
    Task,
    unknown,
    { id: ID; input: UpdateTaskInput },
    TaskListContext
  >({
    mutationFn: ({ id, input }) =>
      apiFetch<Task>(endpoints.task(id), { method: "PATCH", body: input }),

    onMutate: ({ id, input }) => {
      const previous = queryClient.getQueryData<Task[]>(key);

      queryClient.setQueryData<Task[]>(key, (rows) =>
        rows?.map((task) =>
          task.id === id
            ? { ...task, ...input, updatedAt: new Date().toISOString() }
            : task,
        ),
      );

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(toHebrewMessage(error));
    },
    // No `onSettled`: the snapshot delivers the authoritative row on its own.
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const apiFetch = useApiFetch();
  const key = useTasksKey();

  return useMutation<{ id: ID }, unknown, ID, TaskListContext>({
    mutationFn: (id) =>
      apiFetch<{ id: ID }>(endpoints.task(id), { method: "DELETE" }),

    onMutate: (id) => {
      const previous = queryClient.getQueryData<Task[]>(key);

      queryClient.setQueryData<Task[]>(key, (rows) =>
        rows?.filter((task) => task.id !== id),
      );

      return { previous };
    },

    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(toHebrewMessage(error));
    },

    onSuccess: () => toast.success("המשימה נמחקה."),
  });
}

/**
 * The checkbox on a task card. A dedicated hook because it is the highest-traffic
 * mutation in the app and must feel instantaneous — it shares `useUpdateTask`'s
 * optimistic path but stays quiet on success, since the row visibly changing is
 * the confirmation.
 */
export function useToggleTaskStatus() {
  const update = useUpdateTask();

  return {
    ...update,
    toggle: (task: Task) => {
      const status: TaskStatus = task.status === "done" ? "todo" : "done";
      update.mutate({ id: task.id, input: { status } });
    },
  };
}

/** Priority change from the card's overflow menu. */
export function useSetTaskPriority() {
  const update = useUpdateTask();

  return (taskId: ID, priority: TaskPriority) =>
    update.mutate({ id: taskId, input: { priority } });
}
