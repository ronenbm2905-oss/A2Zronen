/**
 * Shared React hooks — the app's entire client-side data access surface.
 *
 * Components read through these and never touch Firestore, `fetch`, or the query
 * cache directly.
 */

export { useApiFetch, useAuth } from "./use-auth";
export {
  useLookups,
  useProject,
  useProjects,
  useTags,
  useTask,
  useTasks,
} from "./use-collections";
export { useConfirm } from "./use-confirm";
export { useDashboardStats, type DashboardStats } from "./use-dashboard-stats";
export { useIsDesktop, useMediaQuery } from "./use-media-query";
export {
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
} from "./use-project-mutations";
export { useChangePassword, useUpdateProfile } from "./use-profile-mutations";
export {
  useRealtimeCollection,
  type SubscribeFn,
} from "./use-realtime-collection";
export { useCreateTag, useDeleteTag, useUpdateTag } from "./use-tag-mutations";
export {
  useConnectTelegram,
  useDisconnectTelegram,
  useTelegramIntegration,
  useTestTelegramConnection,
} from "./use-telegram-integration";
export {
  DEFAULT_TASK_FILTER,
  selectTasks,
  useTaskFilters,
} from "./use-task-filters";
export {
  useCreateTask,
  useDeleteTask,
  useSetTaskPriority,
  useToggleTaskStatus,
  useUpdateTask,
} from "./use-task-mutations";
export { useToasts } from "./use-toasts";
export { useZodForm, type FieldErrors } from "./use-zod-form";
