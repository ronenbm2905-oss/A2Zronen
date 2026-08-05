"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { endpoints } from "@/lib/api-client";
import { toHebrewMessage } from "@/lib/errors/messages.he";
import { queryKeys } from "@/lib/query/keys";
import type { CreateProjectInput, UpdateProjectInput } from "@/lib/schemas";
import { toast } from "@/lib/toast";
import type { ID, Project } from "@/types";

import { useApiFetch, useAuth } from "./use-auth";

/**
 * Project mutations. Same optimistic policy as tasks: update and delete patch
 * the cache immediately and roll back on failure; create waits for the server.
 *
 * Deleting a project detaches its tasks server-side. No client work is needed —
 * the tasks subscription re-emits with `projectId: null` on its own.
 */

type ProjectListContext = { previous: Project[] | undefined };

function useProjectsKey() {
  const { user } = useAuth();
  return queryKeys.projects(user?.uid ?? "anonymous");
}

export function useCreateProject() {
  const apiFetch = useApiFetch();

  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      apiFetch<Project>(endpoints.projects(), { method: "POST", body: input }),
    onSuccess: () => toast.success("הפרויקט נוצר."),
    onError: (error) => toast.error(toHebrewMessage(error)),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const apiFetch = useApiFetch();
  const key = useProjectsKey();

  return useMutation<
    Project,
    unknown,
    { id: ID; input: UpdateProjectInput },
    ProjectListContext
  >({
    mutationFn: ({ id, input }) =>
      apiFetch<Project>(endpoints.project(id), { method: "PATCH", body: input }),

    onMutate: ({ id, input }) => {
      const previous = queryClient.getQueryData<Project[]>(key);

      queryClient.setQueryData<Project[]>(key, (rows) =>
        rows?.map((project) =>
          project.id === id
            ? { ...project, ...input, updatedAt: new Date().toISOString() }
            : project,
        ),
      );

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(toHebrewMessage(error));
    },

    onSuccess: () => toast.success("הפרויקט עודכן."),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const apiFetch = useApiFetch();
  const key = useProjectsKey();

  return useMutation<
    { id: ID; detachedTasks: number },
    unknown,
    ID,
    ProjectListContext
  >({
    mutationFn: (id) =>
      apiFetch<{ id: ID; detachedTasks: number }>(endpoints.project(id), {
        method: "DELETE",
      }),

    onMutate: (id) => {
      const previous = queryClient.getQueryData<Project[]>(key);

      queryClient.setQueryData<Project[]>(key, (rows) =>
        rows?.filter((project) => project.id !== id),
      );

      return { previous };
    },

    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(toHebrewMessage(error));
    },

    onSuccess: ({ detachedTasks }) => {
      toast.success(
        detachedTasks > 0
          ? `הפרויקט נמחק. ${detachedTasks} משימות הועברו ל"ללא פרויקט".`
          : "הפרויקט נמחק.",
      );
    },
  });
}
