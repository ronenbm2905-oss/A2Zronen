import "server-only";

/**
 * Telegram Bot API boundary. Server-only: every export here either holds a bot
 * token or reaches `api.telegram.org`.
 */

export {
  answerCallbackQuery,
  clearReplyMarkup,
  deleteWebhook,
  getMe,
  sendMessage,
  sendTypingAction,
  setWebhook,
  TelegramApiError,
} from "./client";
export {
  CALLBACK_CANCEL,
  CALLBACK_CONFIRM,
  CONFIRM_KEYBOARD,
  MESSAGES,
  parseCommand,
} from "./format";
export type { TelegramUpdate } from "./types";
