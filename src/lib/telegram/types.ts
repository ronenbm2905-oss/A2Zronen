/**
 * The slice of the Telegram Bot API this app models.
 *
 * Hand-written rather than pulled from a types package: the full `Update` union
 * is enormous, and a minimal model keeps the webhook's input surface legible —
 * anything not declared here is not reachable from our code at all, whatever
 * Telegram actually sent.
 *
 * https://core.telegram.org/bots/api
 */

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  /** `"private"` is the only type this bot answers in — see `webhook/route.ts`. */
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  /** Our own payload, set on the inline keyboard we sent. */
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

/** `getMe` — the identity check performed when a token is saved. */
export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface TelegramReplyMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}
