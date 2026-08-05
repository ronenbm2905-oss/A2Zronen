import "server-only";

import { AppError, ERROR_CODES } from "@/lib/errors";

/**
 * A fixed-window rate limiter held in process memory.
 *
 * **Know its limit before relying on it.** The counters live in one Node
 * process, so on a platform that runs several instances the effective ceiling is
 * `limit × instances`. That is acceptable for what it guards — an unauthenticated
 * webhook and a paid model call, where the job is to blunt a loop or a flood, not
 * to meter a quota. A shared store (Redis, Firestore counters) is the upgrade
 * path, and `consume` is the only signature that would change.
 *
 * A fixed window rather than a sliding one: it costs two numbers per key, and
 * the burst-at-the-boundary weakness lets through at most `2 × limit` over two
 * windows — well inside the tolerance of every caller here.
 */

export interface RateLimitRule {
  /** Maximum number of hits allowed inside one window. */
  limit: number;
  windowMs: number;
}

interface Counter {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Whole seconds until the window rolls over. */
  retryAfterSeconds: number;
}

const counters = new Map<string, Counter>();

/**
 * Entries are only ever removed lazily, so a long-lived process that sees many
 * distinct keys would grow without bound. Sweeping expired keys on write keeps
 * the map proportional to *active* keys instead of to all keys ever seen.
 */
const SWEEP_EVERY = 500;
let writesSinceSweep = 0;

function sweep(now: number): void {
  for (const [key, counter] of counters) {
    if (counter.resetAt <= now) counters.delete(key);
  }
}

/** Record one hit against `key` and report whether it is allowed. */
export function consume(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();

  if (++writesSinceSweep >= SWEEP_EVERY) {
    writesSinceSweep = 0;
    sweep(now);
  }

  const existing = counters.get(key);

  if (!existing || existing.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + rule.windowMs });

    return {
      allowed: true,
      remaining: rule.limit - 1,
      retryAfterSeconds: Math.ceil(rule.windowMs / 1000),
    };
  }

  existing.count += 1;

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existing.resetAt - now) / 1000),
  );

  return {
    allowed: existing.count <= rule.limit,
    remaining: Math.max(0, rule.limit - existing.count),
    retryAfterSeconds,
  };
}

/**
 * {@link consume}, but throws instead of reporting.
 *
 * @throws {AppError} `RATE_LIMITED` (429) once the window's allowance is spent.
 */
export function enforceRateLimit(
  key: string,
  rule: RateLimitRule,
  message = "בוצעו יותר מדי בקשות. נסה שוב בעוד רגע.",
): RateLimitResult {
  const result = consume(key, rule);

  if (!result.allowed) {
    throw new AppError(ERROR_CODES.RATE_LIMITED, message, {
      details: { retryAfterSeconds: result.retryAfterSeconds },
    });
  }

  return result;
}

/**
 * The rules this application applies, gathered here so the numbers can be read
 * against each other rather than hunted for at their call sites.
 */
export const RATE_LIMITS = {
  /**
   * Connecting a bot calls out to Telegram twice (`getMe`, `setWebhook`). Low by
   * design: a legitimate user does this once, and a token-guessing loop is the
   * only thing that needs it faster.
   */
  telegramConnect: { limit: 5, windowMs: 60_000 },

  /** Per Telegram chat. Roughly one message every four seconds, sustained. */
  telegramInbound: { limit: 15, windowMs: 60_000 },

  /**
   * Per user, across every chat. This is the one that costs money — each hit is
   * an OpenAI completion plus its tool round-trips.
   */
  aiTurn: { limit: 30, windowMs: 300_000 },
} as const satisfies Record<string, RateLimitRule>;
