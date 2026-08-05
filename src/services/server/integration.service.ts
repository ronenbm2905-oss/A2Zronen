import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { serverEnv } from "@/config/server-env";
import { openSecret, randomToken, sealSecret } from "@/lib/crypto/secret-box";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { ConnectTelegramInput } from "@/lib/schemas";
import {
  deleteWebhook,
  getMe,
  sendMessage,
  setWebhook,
  TelegramApiError,
} from "@/lib/telegram";
import type { ID, TelegramIntegration, TelegramIntegrationStatus } from "@/types";

import {
  agentSessionsRef,
  integrationsRef,
  toTelegramIntegration,
} from "./refs";

/**
 * The Telegram integration: one bot per user, brought by the user.
 *
 * Three properties this module exists to hold:
 *
 * 1. **A bot token never travels back to a browser.** It arrives once through
 *    `POST /api/v1/integrations/telegram`, is sealed with AES-256-GCM, and from
 *    then on is unsealed only inside this process. Every function that returns
 *    something to a caller returns {@link TelegramIntegrationStatus}, which has
 *    no field a token could occupy.
 *
 * 2. **The bot is bound to exactly one chat.** A bot is publicly addressable by
 *    anyone who knows its handle, so "the token belongs to this user" is not the
 *    same claim as "this chat belongs to this user". The `/start <code>` step
 *    below is what turns the first into the second.
 *
 * 3. **Configuration is data, not deployment.** Nothing here reads a bot token
 *    from the environment, so swapping bots is a form submission — the same code
 *    path locally and in production.
 */

const NOT_CONNECTED_MESSAGE = "לא מחובר בוט Telegram לחשבון זה.";

/** A `/start` code is single-use, but a stale one should not linger forever. */
const LINK_CODE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Telegram only accepts an HTTPS callback URL and will not resolve a private
 * host. Detecting that here — rather than surfacing Telegram's own English
 * refusal — is what lets the settings screen say "connected, but not receiving
 * locally" instead of "connection failed".
 */
function isPubliclyReachable(origin: string): boolean {
  try {
    const url = new URL(origin);

    if (url.protocol !== "https:") return false;

    return !/^(localhost|127\.|0\.0\.0\.0|\[::1\]|.*\.local)$/i.test(
      url.hostname,
    );
  } catch {
    return false;
  }
}

/**
 * Where Telegram should deliver updates.
 *
 * `APP_BASE_URL` wins when set, because behind a tunnel or a proxy the origin
 * this process sees is not the one Telegram can reach. Otherwise the origin of
 * the request that triggered the connection is exactly right — it is the URL the
 * user is looking at.
 */
function resolveWebhookUrl(
  webhookId: string,
  requestOrigin: string,
): { url: string; reachable: boolean } {
  const origin = serverEnv.appBaseUrl ?? requestOrigin;

  return {
    url: `${origin.replace(/\/+$/, "")}/api/v1/telegram/webhook/${webhookId}`,
    reachable: isPubliclyReachable(origin),
  };
}

const LOCAL_WEBHOOK_MESSAGE =
  "הבוט מחובר, אך Telegram אינו יכול לשלוח הודעות לכתובת מקומית. " +
  "כדי לבדוק את הבוט בסביבת פיתוח, הרץ מנהרה ציבורית (למשל cloudflared או ngrok) " +
  "והגדר את הכתובת שלה ב-APP_BASE_URL, ואז לחץ «בדיקת חיבור».";

const SET_WEBHOOK_FAILED_MESSAGE =
  "ה-Token נשמר, אך רישום ה-Webhook מול Telegram נכשל. לחץ «בדיקת חיבור» כדי לנסות שוב.";

interface WebhookState {
  registered: boolean;
  message: string | null;
}

/**
 * Bring Telegram's webhook registration in line with what we just stored.
 *
 * The `deleteWebhook` in the unreachable branch is the part that is easy to
 * miss and expensive to get wrong. Connecting rotates `webhookSecret`, so if a
 * *previous* registration were left in place, Telegram would keep delivering
 * updates stamped with the old secret — which the webhook route correctly
 * rejects. The bot would appear connected and simply never answer. Clearing the
 * registration makes "not reachable" an honest, visible state instead.
 */
async function applyWebhook(
  botToken: string,
  webhookId: string,
  webhookSecret: string,
  requestOrigin: string,
): Promise<WebhookState> {
  const { url, reachable } = resolveWebhookUrl(webhookId, requestOrigin);

  if (!reachable) {
    try {
      await deleteWebhook(botToken);
    } catch (error) {
      logger.warn("deleteWebhook failed for unreachable origin", { error });
    }

    return { registered: false, message: LOCAL_WEBHOOK_MESSAGE };
  }

  try {
    await setWebhook(botToken, url, webhookSecret);
    return { registered: true, message: null };
  } catch (error) {
    logger.warn("setWebhook failed", { error });
    return { registered: false, message: SET_WEBHOOK_FAILED_MESSAGE };
  }
}

/** Read the stored record, or `null` when the user has never connected a bot. */
export async function findIntegration(
  uid: ID,
): Promise<TelegramIntegration | null> {
  const snapshot = await integrationsRef().doc(uid).get();
  return snapshot.exists ? toTelegramIntegration(snapshot) : null;
}

/**
 * Resolve an inbound webhook to its owner.
 *
 * The lookup is by the random `webhookId`, not by uid, so the callback URL that
 * lives in Telegram's configuration says nothing about the account behind it.
 * Equality on a single field needs no composite index.
 */
export async function findIntegrationByWebhookId(
  webhookId: string,
): Promise<TelegramIntegration | null> {
  const snapshot = await integrationsRef()
    .where("webhookId", "==", webhookId)
    .limit(1)
    .get();

  const document = snapshot.docs[0];
  return document ? toTelegramIntegration(document) : null;
}

/** Unseal the bot token for a server-side Telegram call. Never returned upward. */
export function readBotToken(integration: TelegramIntegration): string {
  return openSecret(integration.botTokenSealed);
}

/** The client-safe projection. The one shape an endpoint may return. */
export function toTelegramStatus(
  integration: TelegramIntegration | null,
): TelegramIntegrationStatus {
  if (!integration) {
    return {
      connected: false,
      botUsername: null,
      botName: null,
      linkState: "unlinked",
      webhookRegistered: false,
      webhookMessage: null,
      linkCode: null,
      connectedAt: null,
      updatedAt: null,
    };
  }

  return {
    connected: true,
    botUsername: integration.botUsername,
    botName: integration.botName,
    linkState: integration.chatId === null ? "unlinked" : "linked",
    webhookRegistered: integration.webhookRegistered,
    webhookMessage: integration.webhookMessage,
    // Only shown while it is still needed; once a chat is bound it is cleared.
    linkCode: integration.chatId === null ? integration.linkCode : null,
    connectedAt: integration.connectedAt,
    updatedAt: integration.updatedAt,
  };
}

export async function getTelegramStatus(
  uid: ID,
): Promise<TelegramIntegrationStatus> {
  return toTelegramStatus(await findIntegration(uid));
}

/**
 * Turn a Telegram API failure into a Hebrew `AppError`.
 *
 * Telegram's `description` is English prose that sometimes echoes the request,
 * so it is logged and dropped rather than forwarded. The distinction that
 * survives is the only one the user can act on: a bad token versus a bad day.
 */
function toAppError(error: unknown, context: string): AppError {
  if (error instanceof TelegramApiError) {
    logger.warn("Telegram API rejected a call", {
      context,
      method: error.method,
      errorCode: error.errorCode,
      description: error.message,
    });

    if (error.isUnauthorized) {
      return AppError.validation(
        "Telegram דחה את ה-Token. ודא שהעתקת אותו במלואו מ-BotFather.",
        { botToken: ["ה-Token אינו תקף"] },
      );
    }

    return AppError.internal("Telegram דחה את הבקשה. נסה שוב בעוד רגע.", error);
  }

  return AppError.from(error);
}

/**
 * Validate a bot token and store it.
 *
 * The order is load-bearing: `getMe` runs **before** anything is written, so a
 * rejected token leaves an existing, working integration untouched. Only once
 * Telegram has confirmed the token does the document get replaced.
 *
 * @throws {AppError} `VALIDATION_ERROR` when Telegram rejects the token,
 * `CONFIG_ERROR` when `SECRET_ENCRYPTION_KEY` is absent.
 */
export async function connectTelegram(
  uid: ID,
  input: ConnectTelegramInput,
  requestOrigin: string,
): Promise<TelegramIntegrationStatus> {
  const botToken = input.botToken;

  const bot = await getMe(botToken).catch((error: unknown) => {
    throw toAppError(error, "connect:getMe");
  });

  const existing = await findIntegration(uid);

  // Reuse the callback path across reconnects so a tunnel URL a developer has
  // already whitelisted keeps working. The secret is rotated regardless.
  const webhookId = existing?.webhookId || randomToken(18);
  const webhookSecret = randomToken(32);
  const linkCode = randomToken(9);

  // Point the *previous* bot away from us before adopting the new one. A stale
  // webhook would otherwise keep delivering into an account it no longer owns.
  if (existing && existing.botId !== bot.id) {
    await retireWebhook(existing);
  }

  // A failure here is not fatal: the token is valid and worth keeping. The user
  // gets a specific message and a "Test connection" button that retries.
  const webhook = await applyWebhook(
    botToken,
    webhookId,
    webhookSecret,
    requestOrigin,
  );

  // `set` without merge: a reconnect must not inherit the previous bot's chat
  // binding. Whoever holds the new link code claims the new bot.
  await integrationsRef()
    .doc(uid)
    .set({
      userId: uid,
      botTokenSealed: sealSecret(botToken),
      botId: bot.id,
      botUsername: bot.username ?? null,
      botName: bot.first_name,
      webhookId,
      webhookSecret,
      webhookRegistered: webhook.registered,
      webhookMessage: webhook.message,
      linkCode,
      linkCodeIssuedAt: FieldValue.serverTimestamp(),
      chatId: null,
      connectedAt: existing?.connectedAt
        ? new Date(existing.connectedAt)
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  logger.info("Telegram bot connected", {
    uid,
    botId: bot.id,
    webhookRegistered: webhook.registered,
  });

  return getTelegramStatus(uid);
}

/**
 * Re-verify the stored token and, if the webhook is missing, register it again.
 *
 * This is the button a user presses after fixing something — a revoked token, a
 * tunnel that came up after the bot was connected — so it repairs rather than
 * merely reports.
 */
export async function testTelegramConnection(
  uid: ID,
  requestOrigin: string,
): Promise<TelegramIntegrationStatus> {
  const integration = await findIntegration(uid);
  if (!integration) throw AppError.notFound(NOT_CONNECTED_MESSAGE);

  const botToken = readBotToken(integration);

  const bot = await getMe(botToken).catch((error: unknown) => {
    throw toAppError(error, "test:getMe");
  });

  // Re-registering unconditionally rather than only when `webhookRegistered` is
  // false: the stored flag records what Telegram was told last time, and the
  // whole reason to press this button is that reality may have drifted from it.
  const webhook = await applyWebhook(
    botToken,
    integration.webhookId,
    integration.webhookSecret,
    requestOrigin,
  );

  await integrationsRef().doc(uid).update({
    botId: bot.id,
    botUsername: bot.username ?? null,
    botName: bot.first_name,
    webhookRegistered: webhook.registered,
    webhookMessage: webhook.message,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // A linked chat gets a ping, so "test" means something end to end rather than
  // just "the token still parses".
  if (integration.chatId !== null) {
    await sendMessage(
      botToken,
      integration.chatId,
      "בדיקת חיבור עברה בהצלחה ✅ הבוט מחובר לחשבון שלך ומוכן לעבודה.",
    ).catch((error: unknown) => {
      logger.warn("Test message failed", { uid, error });
    });
  }

  return getTelegramStatus(uid);
}

/**
 * Forget the bot entirely.
 *
 * The webhook is removed first — best-effort, because a token revoked in
 * BotFather makes the call impossible and must not strand the record in place.
 * A user asking to disconnect must always end up disconnected.
 */
export async function disconnectTelegram(uid: ID): Promise<{ disconnected: true }> {
  const integration = await findIntegration(uid);

  if (integration) {
    await retireWebhook(integration);
    await clearAgentSessions(uid);
    await integrationsRef().doc(uid).delete();
    logger.info("Telegram bot disconnected", { uid });
  }

  return { disconnected: true };
}

async function retireWebhook(integration: TelegramIntegration): Promise<void> {
  try {
    await deleteWebhook(readBotToken(integration));
  } catch (error) {
    logger.warn("deleteWebhook failed; continuing", {
      uid: integration.userId,
      error,
    });
  }
}

/**
 * Bind a chat to this integration via the code from the settings screen.
 *
 * Comparison is on the code alone because the code *is* the credential: it is
 * 12 bytes of `randomBytes`, shown only to a signed-in owner, single-use, and
 * expiring. A wrong code and an expired one are reported identically.
 */
export async function linkTelegramChat(
  integration: TelegramIntegration,
  code: string,
  chatId: number,
): Promise<boolean> {
  if (!integration.linkCode || integration.linkCode !== code) return false;

  const snapshot = await integrationsRef().doc(integration.userId).get();
  const issuedAt = snapshot.data()?.linkCodeIssuedAt as
    | { toDate(): Date }
    | undefined;

  if (issuedAt && Date.now() - issuedAt.toDate().getTime() > LINK_CODE_TTL_MS) {
    return false;
  }

  await integrationsRef().doc(integration.userId).update({
    chatId,
    // Single use: consumed the moment it works.
    linkCode: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("Telegram chat linked", { uid: integration.userId });

  return true;
}

/* ---------------------------------------------------------------------------
 * Conversation state
 * ------------------------------------------------------------------------ */

/**
 * What the agent remembers between messages.
 *
 * The transcript is stored as a **JSON string**, not as structured fields. The
 * OpenAI message shape contains arrays nested inside arrays and `undefined`
 * values, neither of which Firestore accepts; serializing sidesteps a class of
 * write failures that would only ever appear mid-conversation.
 */
export interface AgentSession {
  transcript: string;
  /** The mutating action awaiting a yes/no, serialized the same way. */
  pendingAction: string | null;
  pendingActionAt: number | null;
}

const EMPTY_SESSION: AgentSession = {
  transcript: "[]",
  pendingAction: null,
  pendingActionAt: null,
};

function sessionId(uid: ID, chatId: number): string {
  return `${uid}:${chatId}`;
}

export async function readAgentSession(
  uid: ID,
  chatId: number,
): Promise<AgentSession> {
  const snapshot = await agentSessionDoc(uid, chatId).get();
  if (!snapshot.exists) return EMPTY_SESSION;

  const data = snapshot.data() ?? {};

  return {
    transcript: typeof data.transcript === "string" ? data.transcript : "[]",
    pendingAction:
      typeof data.pendingAction === "string" ? data.pendingAction : null,
    pendingActionAt:
      typeof data.pendingActionAt === "number" ? data.pendingActionAt : null,
  };
}

export async function writeAgentSession(
  uid: ID,
  chatId: number,
  session: AgentSession,
): Promise<void> {
  await agentSessionDoc(uid, chatId).set(
    {
      userId: uid,
      chatId,
      ...session,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function clearAgentSession(uid: ID, chatId: number): Promise<void> {
  await agentSessionDoc(uid, chatId).delete();
}

/** Called on disconnect: the transcript belongs to the bot that produced it. */
async function clearAgentSessions(uid: ID): Promise<void> {
  const snapshot = await agentSessionsRef().where("userId", "==", uid).get();
  await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
}

function agentSessionDoc(uid: ID, chatId: number) {
  return agentSessionsRef().doc(sessionId(uid, chatId));
}
