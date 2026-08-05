import { appConfig } from "@/config/app";
import type { ID } from "@/types";

const base = `${appConfig.apiBasePath}/${appConfig.apiVersion}`;

/**
 * Typed URL builders for `/api/v1`. Centralised so a path change is one edit,
 * and so ids are always encoded.
 */
export const endpoints = {
  bootstrap: () => `${base}/auth/bootstrap`,
  me: () => `${base}/me`,

  tasks: () => `${base}/tasks`,
  task: (id: ID) => `${base}/tasks/${encodeURIComponent(id)}`,

  projects: () => `${base}/projects`,
  project: (id: ID) => `${base}/projects/${encodeURIComponent(id)}`,

  tags: () => `${base}/tags`,
  tag: (id: ID) => `${base}/tags/${encodeURIComponent(id)}`,

  telegramIntegration: () => `${base}/integrations/telegram`,
  telegramIntegrationTest: () => `${base}/integrations/telegram/test`,
} as const;

export type Endpoints = typeof endpoints;
