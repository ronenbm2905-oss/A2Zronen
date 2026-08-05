import "server-only";

import { AppError, ERROR_CODES } from "@/lib/errors";
import { logger } from "@/lib/logger";

import type {
  TelegramBotInfo,
  TelegramMessage,
  TelegramReplyMarkup,
} from "./types";

/**
 * The only code in this system that talks to `api.telegram.org`.
 *
 * Every call runs on the server. The browser never learns a bot token — it
 * submits one once, to our own API, and from that point the token lives sealed
 * in Firestore and is unsealed only inside this process.
 *
 * Two behaviours worth knowing before reading further:
 *
 * 1. **Telegram answers 200 on failure.** Errors arrive as `{ok: false,
 *    description}` inside a successful HTTP response, so `response.ok` proves
 *    nothing. `callTelegram` branches on the envelope, not the status.
 *
 * 2. **`description` is Telegram's own English prose** and can contain the
 *    request that produced it. It is logged and mapped to Hebrew, never handed
 *    to the client verbatim.
 */

const API_ROOT = "https://api.telegram.org";
const REQUEST_TIMEOUT_MS = 10_000;

interface TelegramEnvelope<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/**
 * A failed Telegram call, carrying the API's own error code so callers can tell
 * "this token is wrong" (401) from "Telegram is having a bad day" (5xx).
 */
export class TelegramApiError extends Error {
  readonly method: string;
  readonly errorCode: number | null;

  constructor(method: string, description: string, errorCode: number | null) {
    super(description);
    this.name = "TelegramApiError";
    this.method = method;
    this.errorCode = errorCode;
  }

  /** `true` when Telegram rejected the *token*, not the request. */
  get isUnauthorized(): boolean {
    return this.errorCode === 401 || this.errorCode === 404;
  }
}

/**
 * Invoke a Bot API method.
 *
 * @throws {TelegramApiError} when Telegram reports `ok: false`.
 * @throws {AppError} `INTERNAL_ERROR` when the call never completed (network,
 * timeout, or a body that is not JSON).
 */
export async function callTelegram<T>(
  botToken: string,
  method: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_ROOT}/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
      // Without this a hung connection would hold the webhook handler open past
      // Telegram's own retry window, and the same update would be redelivered.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    // The token is in the URL, so the error is logged by method name only.
    logger.error("Telegram request failed", { method, error });

    throw new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      "לא ניתן להתחבר לשרתי Telegram. נסה שוב בעוד רגע.",
      { cause: error },
    );
  }

  let envelope: TelegramEnvelope<T>;

  try {
    envelope = (await response.json()) as TelegramEnvelope<T>;
  } catch (error) {
    throw new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      `Telegram החזיר תשובה לא צפויה (${response.status}).`,
      { cause: error },
    );
  }

  if (!envelope.ok || envelope.result === undefined) {
    throw new TelegramApiError(
      method,
      envelope.description ?? "Unknown Telegram API error",
      envelope.error_code ?? response.status,
    );
  }

  return envelope.result;
}

/** Identity of the bot behind a token. The check that validates a saved token. */
export function getMe(botToken: string): Promise<TelegramBotInfo> {
  return callTelegram<TelegramBotInfo>(botToken, "getMe");
}

/**
 * Point the bot at our callback URL.
 *
 * `secret_token` is the part that matters: Telegram echoes it in the
 * `X-Telegram-Bot-Api-Secret-Token` header on every delivery, which is how the
 * webhook route tells a real update from anyone who guessed the path.
 *
 * `drop_pending_updates` clears the backlog a bot may have accumulated while it
 * was pointed elsewhere — replaying week-old commands on connect would be
 * surprising at best.
 */
export function setWebhook(
  botToken: string,
  url: string,
  secretToken: string,
): Promise<boolean> {
  return callTelegram<boolean>(botToken, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
    max_connections: 20,
  });
}

export function deleteWebhook(botToken: string): Promise<boolean> {
  return callTelegram<boolean>(botToken, "deleteWebhook", {
    drop_pending_updates: true,
  });
}

export interface SendMessageOptions {
  replyMarkup?: TelegramReplyMarkup;
}

/** Telegram rejects a message body over 4096 characters outright. */
const MAX_MESSAGE_LENGTH = 4_000;

export function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  options: SendMessageOptions = {},
): Promise<TelegramMessage> {
  // No `parse_mode`: task titles are user input, and with HTML or MarkdownV2
  // enabled a title containing `<` or `_` would make Telegram reject the whole
  // message. Plain text has no escaping to forget.
  return callTelegram<TelegramMessage>(botToken, "sendMessage", {
    chat_id: chatId,
    text: truncate(text),
    ...(options.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    link_preview_options: { is_disabled: true },
  });
}

/** The "typing…" indicator. Best-effort: a failure here must never fail a turn. */
export async function sendTypingAction(
  botToken: string,
  chatId: number,
): Promise<void> {
  try {
    await callTelegram(botToken, "sendChatAction", {
      chat_id: chatId,
      action: "typing",
    });
  } catch (error) {
    logger.debug("sendChatAction failed", { error });
  }
}

/**
 * Acknowledge a button press.
 *
 * Telegram shows a spinner on the button until this is called, so skipping it
 * leaves the user staring at a control that looks stuck. Best-effort for the
 * same reason as the typing action.
 */
export async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  try {
    await callTelegram(botToken, "answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
    });
  } catch (error) {
    logger.debug("answerCallbackQuery failed", { error });
  }
}

/** Remove the inline keyboard from a message the user has already acted on. */
export async function clearReplyMarkup(
  botToken: string,
  chatId: number,
  messageId: number,
): Promise<void> {
  try {
    await callTelegram(botToken, "editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  } catch (error) {
    // Telegram errors when the markup is already empty (double-tap, retry).
    logger.debug("editMessageReplyMarkup failed", { error });
  }
}

function truncate(text: string): string {
  if (text.length <= MAX_MESSAGE_LENGTH) return text;
  return `${text.slice(0, MAX_MESSAGE_LENGTH - 1)}…`;
}
