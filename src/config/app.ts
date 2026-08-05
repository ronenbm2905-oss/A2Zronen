/**
 * Static application constants.
 *
 * Values here are compile-time constants that never depend on the environment.
 * Anything that varies per deployment belongs in `@/config/env` instead.
 */
export const appConfig = {
  name: "a2z",
  version: "0.1.0",

  /** Root of the HTTP API. This project is API-first: every mutation goes through it. */
  apiBasePath: "/api",

  /** Current API version segment, e.g. `/api/v1/...`. */
  apiVersion: "v1",

  /** Correlation header attached by the proxy and echoed on API responses. */
  requestIdHeader: "x-request-id",
} as const;

export type AppConfig = typeof appConfig;
