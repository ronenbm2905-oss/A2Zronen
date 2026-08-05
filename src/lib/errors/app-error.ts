import {
  ERROR_CODES,
  ERROR_MESSAGES,
  ERROR_STATUS,
  type ErrorCode,
} from "./error-codes";

interface AppErrorOptions {
  /** Structured context safe to return to the client (e.g. field validation issues). */
  details?: unknown;
  cause?: unknown;
  /** `false` marks an unexpected failure that was wrapped rather than raised on purpose. */
  isOperational?: boolean;
}

/**
 * The one error type the application throws on purpose.
 *
 * `withApiHandler` maps an `AppError` to its declared HTTP status and returns
 * its message verbatim. Anything that is *not* an `AppError` is treated as an
 * unexpected failure and collapsed into a generic 500, so internals never leak.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  /** `true` when the error was raised deliberately rather than thrown by surprise. */
  readonly isOperational: boolean;

  constructor(code: ErrorCode, message?: string, options: AppErrorOptions = {}) {
    super(message ?? ERROR_MESSAGES[code], { cause: options.cause });

    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details === undefined ? {} : { details: this.details }),
    };
  }

  static validation(message?: string, details?: unknown): AppError {
    return new AppError(ERROR_CODES.VALIDATION_ERROR, message, { details });
  }

  static unauthorized(message?: string): AppError {
    return new AppError(ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message?: string): AppError {
    return new AppError(ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message?: string): AppError {
    return new AppError(ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message?: string): AppError {
    return new AppError(ERROR_CODES.CONFLICT, message);
  }

  static config(message?: string): AppError {
    return new AppError(ERROR_CODES.CONFIG_ERROR, message);
  }

  static internal(message?: string, cause?: unknown): AppError {
    return new AppError(ERROR_CODES.INTERNAL_ERROR, message, { cause });
  }

  /**
   * Normalize any thrown value into an `AppError`.
   *
   * Unknown failures become a generic `INTERNAL_ERROR` with the default
   * message — the original value is kept as `cause` for logging only.
   */
  static from(error: unknown): AppError {
    if (error instanceof AppError) return error;

    // Surprises are not operational; the handler logs these at error level.
    return new AppError(ERROR_CODES.INTERNAL_ERROR, undefined, {
      cause: error,
      isOperational: false,
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
