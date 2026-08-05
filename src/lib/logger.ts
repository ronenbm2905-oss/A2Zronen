/**
 * Minimal leveled logger.
 *
 * Deliberately dependency-free (it must not import `@/config/env`, which logs
 * through it) and deliberately thin — swapping in a real transport later means
 * changing only this file.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const isProduction = process.env.NODE_ENV === "production";

function emit(level: LogLevel, message: string, meta?: unknown): void {
  // Debug output is noise in production.
  if (level === "debug" && isProduction) return;

  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;

  if (meta === undefined) {
    console[level](prefix, message);
    return;
  }

  console[level](prefix, message, meta);
}

export const logger = {
  debug: (message: string, meta?: unknown) => emit("debug", message, meta),
  info: (message: string, meta?: unknown) => emit("info", message, meta),
  warn: (message: string, meta?: unknown) => emit("warn", message, meta),
  error: (message: string, meta?: unknown) => emit("error", message, meta),
} as const;

export type Logger = typeof logger;
