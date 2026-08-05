"use client";

import { useCallback, useMemo } from "react";

import { queryKeys } from "@/lib/query/keys";
import { subscribeProjects, subscribeTags, subscribeTasks } from "@/services";
import type { ID, Project, Tag, Task } from "@/types";
import { indexById } from "@/utils";

import { useAuth } from "./use-auth";
import { useRealtimeCollection } from "./use-realtime-collection";

/**
 * The three realtime collections every screen reads from.
 *
 * One subscription per collection, opened once by the `(app)` shell and shared
 * through the query cache. Filtering, sorting, dashboard statistics and the
 * project/tag joins are all derived from these arrays in memory — see D1 in the
 * plan for the trade-off and its ceiling.
 *
 * Keys are namespaced by uid, so a signed-out or unconfigured session simply
 * reads a disabled query rather than someone else's rows.
 */

function useUid(): { uid: ID | null; enabled: boolean } {
  const { user, status } = useAuth();
  return { uid: user?.uid ?? null, enabled: status === "authenticated" && !!user };
}

export function useTasks() {
  const { uid, enabled } = useUid();

  return useRealtimeCollection<Task>(
    queryKeys.tasks(uid ?? "anonymous"),
    useCallback(
      (onData, onError) => subscribeTasks(uid!, { onData, onError }),
      [uid],
    ),
    enabled,
  );
}

export function useProjects() {
  const { uid, enabled } = useUid();

  return useRealtimeCollection<Project>(
    queryKeys.projects(uid ?? "anonymous"),
    useCallback(
      (onData, onError) => subscribeProjects(uid!, { onData, onError }),
      [uid],
    ),
    enabled,
  );
}

export function useTags() {
  const { uid, enabled } = useUid();

  return useRealtimeCollection<Tag>(
    queryKeys.tags(uid ?? "anonymous"),
    useCallback(
      (onData, onError) => subscribeTags(uid!, { onData, onError }),
      [uid],
    ),
    enabled,
  );
}

/**
 * A single task, selected from the already-loaded collection.
 *
 * The detail screen deliberately does not fetch `GET /api/v1/tasks/[id]`: the
 * task is already in the cache and already live, so reading it from there keeps
 * the detail view updating in realtime and avoids a redundant round-trip.
 * `notFound` distinguishes "still loading" from "no such task", which the page
 * needs in order to decide between a skeleton and a 404.
 */
export function useTask(taskId: ID) {
  const query = useTasks();

  const task = useMemo(
    () => query.data?.find((item) => item.id === taskId),
    [query.data, taskId],
  );

  return {
    ...query,
    data: task,
    notFound: !query.isLoading && !query.isError && !task,
  };
}

export function useProject(projectId: ID) {
  const query = useProjects();

  const project = useMemo(
    () => query.data?.find((item) => item.id === projectId),
    [query.data, projectId],
  );

  return {
    ...query,
    data: project,
    notFound: !query.isLoading && !query.isError && !project,
  };
}

/** Id → entity maps for resolving a task's `projectId` and `tagIds` to names. */
export function useLookups() {
  const projects = useProjects();
  const tags = useTags();

  const projectsById = useMemo(
    () => indexById(projects.data ?? []),
    [projects.data],
  );
  const tagsById = useMemo(() => indexById(tags.data ?? []), [tags.data]);

  return {
    projectsById,
    tagsById,
    projects: projects.data ?? [],
    tags: tags.data ?? [],
    isLoading: projects.isLoading || tags.isLoading,
  };
}
