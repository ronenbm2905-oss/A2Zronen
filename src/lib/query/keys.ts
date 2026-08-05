import type { ID } from "@/types";

/**
 * Query key factory.
 *
 * Every key is namespaced by uid. Combined with `queryClient.clear()` on sign
 * out, that makes a cross-user cache leak structurally impossible: user B's
 * hooks read `['tasks', B]` and could not reach `['tasks', A]` even if the
 * entry were somehow still resident.
 */
export const queryKeys = {
  tasks: (uid: ID) => ["tasks", uid] as const,
  projects: (uid: ID) => ["projects", uid] as const,
  tags: (uid: ID) => ["tags", uid] as const,
  profile: (uid: ID) => ["profile", uid] as const,
  telegramIntegration: (uid: ID) => ["telegram-integration", uid] as const,
} as const;

export type QueryKeys = typeof queryKeys;
