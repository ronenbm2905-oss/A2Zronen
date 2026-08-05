/**
 * Minimal leveled logger.
 *
 * Deliberately dependency-free (it must not import `@/config/env`, which logs
 * through it) and deliberately thin — swapping in a real transport later means
 * changing only this file.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const isProduction = process.env.NODE_ENV === "production";

/**
 * `Error` carries `message`, `stack` and `name` as non-enumerable properties, so
 * anything that serializes meta — the Next.js error overlay, `JSON.stringify`, a
 * future log transport — renders a thrown error as `{}`. That turned a
 * `FirebaseError` with a `permission-denied` code into an empty object at the
 * exact moment its code was the only thing worth reading.
 *
 * Flattening here rather than at each call site keeps `logger.error(msg, { err })`
 * honest everywhere.
 */
function serializeErrors(meta: unknown): unknown {
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      // Firebase, Node and DOM exceptions all carry a `code`; it is usually the
      // most actionable field on the object.
      ...("code" in meta ? { code: (meta as { code: unknown }).code } : {}),
      stack: meta.stack,
    };
  }

  if (Array.isArray(meta)) return meta.map(serializeErrors);

  if (meta && typeof meta === "object") {
    return Object.fromEntries(
      Object.entries(meta).map(([key, value]) => [key, serializeErrors(value)]),
    );
  }

  return meta;
}

/**
 * A one-line, human-readable summary of an unknown thrown value.
 *
 * Meant for the *message* argument rather than `meta`. Some consumers — the
 * Next.js dev error overlay in particular — render extra console arguments as
 * `{}`, so a caller that needs the error visible must fold it into the string.
 *
 * ```ts
 * logger.error(`Subscription failed — ${describeError(error)}`, { error });
 * // → "Subscription failed — failed-precondition: The query requires an index."
 * ```
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = "code" in error ? String((error as { code: unknown }).code) : undefined;
    return `${code ?? error.name}: ${error.message}`;
  }

  return typeof error === "string" ? error : JSON.stringify(error) ?? String(error);
}

function emit(level: LogLevel, message: string, meta?: unknown): void {
  // Debug output is noise in production.
  if (level === "debug" && isProduction) return;

  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;

  if (meta === undefined) {
    console[level](prefix, message);
    return;
  }

  console[level](prefix, message, serializeErrors(meta));
}

export const logger = {
  debug: (message: string, meta?: unknown) => emit("debug", message, meta),
  info: (message: string, meta?: unknown) => emit("info", message, meta),
  warn: (message: string, meta?: unknown) => emit("warn", message, meta),
  error: (message: string, meta?: unknown) => emit("error", message, meta),
} as const;

export type Logger = typeof logger;
