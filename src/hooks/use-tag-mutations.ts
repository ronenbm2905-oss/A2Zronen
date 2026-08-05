"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { endpoints } from "@/lib/api-client";
import { toHebrewMessage } from "@/lib/errors/messages.he";
import { queryKeys } from "@/lib/query/keys";
import type { CreateTagInput, UpdateTagInput } from "@/lib/schemas";
import { toast } from "@/lib/toast";
import type { ID, Tag } from "@/types";

import { useApiFetch, useAuth } from "./use-auth";

/**
 * Tag mutations. Deleting a tag strips it from every task server-side; the tasks
 * subscription re-emits without it, so no client-side cascade is needed.
 */

type TagListContext = { previous: Tag[] | undefined };

function useTagsKey() {
  const { user } = useAuth();
  return queryKeys.tags(user?.uid ?? "anonymous");
}

export function useCreateTag() {
  const apiFetch = useApiFetch();

  return useMutation({
    mutationFn: (input: CreateTagInput) =>
      apiFetch<Tag>(endpoints.tags(), { method: "POST", body: input }),
    onSuccess: () => toast.success("התגית נוצרה."),
    onError: (error) => toast.error(toHebrewMessage(error)),
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  const apiFetch = useApiFetch();
  const key = useTagsKey();

  return useMutation<Tag, unknown, { id: ID; input: UpdateTagInput }, TagListContext>({
    mutationFn: ({ id, input }) =>
      apiFetch<Tag>(endpoints.tag(id), { method: "PATCH", body: input }),

    onMutate: ({ id, input }) => {
      const previous = queryClient.getQueryData<Tag[]>(key);

      queryClient.setQueryData<Tag[]>(key, (rows) =>
        rows?.map((tag) =>
          tag.id === id
            ? { ...tag, ...input, updatedAt: new Date().toISOString() }
            : tag,
        ),
      );

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(toHebrewMessage(error));
    },

    onSuccess: () => toast.success("התגית עודכנה."),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const apiFetch = useApiFetch();
  const key = useTagsKey();

  return useMutation<
    { id: ID; detachedTasks: number },
    unknown,
    ID,
    TagListContext
  >({
    mutationFn: (id) =>
      apiFetch<{ id: ID; detachedTasks: number }>(endpoints.tag(id), {
        method: "DELETE",
      }),

    onMutate: (id) => {
      const previous = queryClient.getQueryData<Tag[]>(key);

      queryClient.setQueryData<Tag[]>(key, (rows) =>
        rows?.filter((tag) => tag.id !== id),
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
          ? `התגית נמחקה והוסרה מ-${detachedTasks} משימות.`
          : "התגית נמחקה.",
      );
    },
  });
}
