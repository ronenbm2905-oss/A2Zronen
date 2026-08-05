import type { ID, ISODateString, Nullable } from "./common";

/**
 * The Telegram integration, in the two shapes it legitimately takes.
 *
 * The split is the point of this file. `TelegramIntegration` is the stored
 * record and it holds a sealed bot token; `TelegramIntegrationStatus` is what
 * `GET /api/v1/integrations/telegram` returns, and it has no field that could
 * carry one. Once saved, a bot token only ever travels from Firestore to
 * `api.telegram.org` — never back to a browser.
 */

export const TELEGRAM_LINK_STATES = ["unlinked", "linked"] as const;
export type TelegramLinkState = (typeof TELEGRAM_LINK_STATES)[number];

/** What the settings screen renders. Safe to serialize to the client. */
export interface TelegramIntegrationStatus {
  connected: boolean;
  /** `@handle` of the connected bot, for confirming the right bot is wired up. */
  botUsername: Nullable<string>;
  botName: Nullable<string>;
  linkState: TelegramLinkState;
  /**
   * Whether Telegram is actually delivering updates. `false` with
   * `connected: true` is the normal local-development state — see
   * `webhookMessage` for why.
   */
  webhookRegistered: boolean;
  /** Hebrew explanation shown under the status, e.g. why a webhook is absent. */
  webhookMessage: Nullable<string>;
  /** The `/start` code the user sends to their bot to claim it. */
  linkCode: Nullable<string>;
  connectedAt: Nullable<ISODateString>;
  updatedAt: Nullable<ISODateString>;
}

/**
 * The `integrations/{uid}` document. **Server-side only** — it is never returned
 * by an endpoint, and `firestore.rules` denies the browser both read and write.
 */
export interface TelegramIntegration {
  userId: ID;
  /** Output of `sealSecret()`. Never the raw token. */
  botTokenSealed: string;
  botId: Nullable<number>;
  botUsername: Nullable<string>;
  botName: Nullable<string>;
  /**
   * The opaque path segment Telegram calls back on. Random rather than the uid,
   * so the callback URL — which travels through Telegram's infrastructure and
   * their logs — reveals nothing about the account behind it.
   */
  webhookId: string;
  /** Echoed by Telegram in `X-Telegram-Bot-Api-Secret-Token`. */
  webhookSecret: string;
  webhookRegistered: boolean;
  webhookMessage: Nullable<string>;
  /** One-time code for `/start`; cleared once a chat is bound. */
  linkCode: Nullable<string>;
  /** The single chat allowed to talk to this user's agent. */
  chatId: Nullable<number>;
  connectedAt: Nullable<ISODateString>;
  updatedAt: Nullable<ISODateString>;
}
