/**
 * Domain services.
 *
 * One module per domain, each exposing plain functions that own the business
 * rules. Route handlers stay thin: parse input, call a service, return the
 * result.
 *
 * This barrel re-exports **`./client` only**. `./server` is deliberately absent:
 * it carries the Firebase service account, and re-exporting it here would pull
 * `firebase-admin` into every bundle that touches any service — including client
 * ones. Server code imports `@/services/server` explicitly, so the boundary is
 * visible at the call site.
 *
 * Three things enforce that beyond convention: `import "server-only"` on the
 * server modules, an ESLint `no-restricted-imports` zone over the client
 * directories, and `serverExternalPackages` in `next.config.ts`.
 */
export {
  subscribeProjects,
  subscribeTags,
  subscribeTasks,
  toProject,
  toTag,
  toTask,
  type SubscriptionHandlers,
} from "./client";
