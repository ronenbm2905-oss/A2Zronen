import "server-only";

/**
 * Server-side domain services — the only code in this system that writes to
 * Firestore. Every function takes the caller's `uid` from a verified ID token.
 *
 * This barrel is `server-only`: importing it from a client component is a build
 * error, and ESLint flags it earlier still (see `eslint.config.mjs`).
 */

export {
  connectTelegram,
  disconnectTelegram,
  findIntegrationByWebhookId,
  getTelegramStatus,
  testTelegramConnection,
} from "./integration.service";
export { handleTelegramUpdate } from "./telegram-agent.service";
export {
  countProjectTasks,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "./project.service";
export {
  countTagTasks,
  createTag,
  deleteTag,
  getTag,
  listTags,
  updateTag,
} from "./tag.service";
export {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from "./task.service";
export { bootstrapUser, getProfile, updateProfile } from "./user.service";
