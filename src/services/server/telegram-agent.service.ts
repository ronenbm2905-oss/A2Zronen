import "server-only";

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { isOpenAiConfigured } from "@/config/server-env";
import {
  applyPendingAction,
  resolveSelfOrigin,
  runAgentTurn,
  type PendingAction,
} from "@/lib/ai";
import { logger } from "@/lib/logger";
import { consume, RATE_LIMITS } from "@/lib/rate-limit";
import {
  answerCallbackQuery,
  CALLBACK_CANCEL,
  CALLBACK_CONFIRM,
  clearReplyMarkup,
  CONFIRM_KEYBOARD,
  MESSAGES,
  parseCommand,
  sendMessage,
  sendTypingAction,
  type TelegramUpdate,
} from "@/lib/telegram";
import type { TelegramIntegration } from "@/types";

import {
  clearAgentSession,
  linkTelegramChat,
  readAgentSession,
  readBotToken,
  writeAgentSession,
} from "./integration.service";

/**
 * What happens when a Telegram update arrives.
 *
 * The authorization chain is the whole of this module's security, and it is
 * short on purpose:
 *
 * ```
 * webhook secret  → the request really came from Telegram   (checked in the route)
 * webhookId       → which integration, and therefore which uid
 * chatId          → this chat is the one that claimed the bot
 * ```
 *
 * Nothing in the payload names an account. `uid` comes from the integration
 * record and goes to `@/lib/ai`, which calls `/api/v1` as that user — so the
 * agent sits inside exactly the same tenant boundary as the web app, with no
 * second copy of the ownership rules.
 *
 * A bot is publicly addressable by anyone who knows its handle, which is why the
 * `chatId` check exists at all: holding the token proves the *bot* belongs to
 * this user, not that the person typing does.
 */

const CONFIRM_WORDS = new Set([
  "כן",
  "אישור",
  "אשר",
  "מאשר",
  "מאשרת",
  "בצע",
  "בסדר",
  "אוקיי",
  "אוקי",
  "yes",
  "ok",
  "y",
]);

const CANCEL_WORDS = new Set([
  "לא",
  "ביטול",
  "בטל",
  "בטלי",
  "עצור",
  "no",
  "cancel",
  "n",
]);

/**
 * Route one update.
 *
 * Never throws: it is invoked from `after()`, where a rejection would be an
 * unhandled promise and the user would simply see silence. Every failure is
 * logged and answered with a message the user can act on.
 */
export async function handleTelegramUpdate(
  integration: TelegramIntegration,
  update: TelegramUpdate,
  requestOrigin: string,
): Promise<void> {
  let botToken: string;

  try {
    botToken = readBotToken(integration);
  } catch (error) {
    // The stored token cannot be unsealed — `SECRET_ENCRYPTION_KEY` was rotated
    // or the document was edited. There is no way to reply without it, so the
    // log is the only signal; the user's next visit to the settings screen is
    // where this becomes visible and fixable.
    logger.error("Cannot unseal bot token for inbound update", {
      uid: integration.userId,
      error,
    });
    return;
  }

  try {
    if (update.callback_query) {
      await handleCallback(integration, botToken, update, requestOrigin);
      return;
    }

    const message = update.message ?? update.edited_message;
    if (!message) return;

    // Groups are out of scope: the bot is bound to one private chat, and a group
    // would let anyone in it drive another person's account.
    if (message.chat.type !== "private") return;

    const chatId = message.chat.id;

    if (integration.chatId === null) {
      await handleLinking(integration, botToken, chatId, message.text ?? "");
      return;
    }

    if (chatId !== integration.chatId) {
      await sendMessage(botToken, chatId, MESSAGES.unauthorized);
      return;
    }

    if (!message.text) {
      await sendMessage(botToken, chatId, MESSAGES.unsupported);
      return;
    }

    await handleAuthorizedMessage(
      integration,
      botToken,
      chatId,
      message.text,
      message.from?.first_name ?? null,
      requestOrigin,
    );
  } catch (error) {
    logger.error("Telegram update handling failed", {
      uid: integration.userId,
      error,
    });

    const chatId =
      update.message?.chat.id ??
      update.callback_query?.message?.chat.id ??
      integration.chatId;

    if (chatId !== null && chatId !== undefined) {
      await sendMessage(botToken, chatId, MESSAGES.failure).catch(() => {
        // The bot cannot even report the failure; the log above is all there is.
      });
    }
  }
}

/**
 * The claim step: an unlinked bot accepts nothing but `/start <code>`.
 *
 * Until a chat is bound, every other message gets the same instruction — so a
 * stranger who finds the bot learns only that it is not set up for them.
 */
async function handleLinking(
  integration: TelegramIntegration,
  botToken: string,
  chatId: number,
  text: string,
): Promise<void> {
  const command = parseCommand(text);

  if (command?.command !== "start" || !command.argument) {
    await sendMessage(botToken, chatId, MESSAGES.linkRequired);
    return;
  }

  const linked = await linkTelegramChat(integration, command.argument, chatId);

  if (!linked) {
    await sendMessage(botToken, chatId, MESSAGES.linkInvalid);
    return;
  }

  await sendMessage(botToken, chatId, MESSAGES.linked(integration.botName));
}

async function handleAuthorizedMessage(
  integration: TelegramIntegration,
  botToken: string,
  chatId: number,
  text: string,
  firstName: string | null,
  requestOrigin: string,
): Promise<void> {
  const uid = integration.userId;

  const command = parseCommand(text);

  if (command) {
    switch (command.command) {
      case "start":
      case "help":
        await sendMessage(
          botToken,
          chatId,
          command.command === "help" ? MESSAGES.help : MESSAGES.linked(firstName),
        );
        return;

      case "reset":
        await clearAgentSession(uid, chatId);
        await sendMessage(botToken, chatId, MESSAGES.reset);
        return;

      default:
        // Unknown slash commands fall through to the agent — "/מה נשאר" is a
        // reasonable thing for someone to type.
        break;
    }
  }

  const session = await readAgentSession(uid, chatId);
  const pending = parsePendingAction(session.pendingAction);

  // A pending confirmation takes precedence over the model: a bare "כן" must
  // resolve the question on screen, not start a new conversation about it.
  if (pending) {
    const answer = text.trim().toLocaleLowerCase();

    if (CONFIRM_WORDS.has(answer)) {
      await resolveConfirmation(integration, botToken, chatId, pending, true, requestOrigin);
      return;
    }

    if (CANCEL_WORDS.has(answer)) {
      await resolveConfirmation(integration, botToken, chatId, pending, false, requestOrigin);
      return;
    }

    // Anything else means the user moved on; drop the stale action rather than
    // leaving it armed behind an unrelated conversation.
    await writeAgentSession(uid, chatId, {
      ...session,
      pendingAction: null,
      pendingActionAt: null,
    });
  }

  if (!isOpenAiConfigured) {
    await sendMessage(botToken, chatId, MESSAGES.aiUnavailable);
    return;
  }

  // Per chat first (cheap flood control), then per user (the one that costs
  // money — it covers every chat and survives a reconnect).
  if (!consume(`tg:chat:${chatId}`, RATE_LIMITS.telegramInbound).allowed) {
    await sendMessage(botToken, chatId, MESSAGES.rateLimited);
    return;
  }

  if (!consume(`ai:turn:${uid}`, RATE_LIMITS.aiTurn).allowed) {
    await sendMessage(botToken, chatId, MESSAGES.rateLimited);
    return;
  }

  await sendTypingAction(botToken, chatId);

  const result = await runAgentTurn({
    uid,
    userName: firstName,
    message: text,
    history: parseHistory(session.transcript),
    baseUrl: resolveSelfOrigin(requestOrigin),
  });

  await writeAgentSession(uid, chatId, {
    transcript: JSON.stringify(result.history),
    pendingAction: result.pendingAction
      ? JSON.stringify(result.pendingAction)
      : null,
    pendingActionAt: result.pendingAction ? Date.now() : null,
  });

  await sendMessage(botToken, chatId, result.reply, {
    // The keyboard is what makes the confirmation unmissable; typing "כן" also
    // works, which matters on a client where inline buttons render poorly.
    replyMarkup: result.pendingAction ? CONFIRM_KEYBOARD : undefined,
  });
}

/** The ✅ / ❌ buttons attached to a preview. */
async function handleCallback(
  integration: TelegramIntegration,
  botToken: string,
  update: TelegramUpdate,
  requestOrigin: string,
): Promise<void> {
  const query = update.callback_query;
  if (!query) return;

  const chatId = query.message?.chat.id;

  // Always acknowledge, even a payload we go on to ignore — until this returns,
  // Telegram leaves a spinner on the button the user pressed.
  await answerCallbackQuery(botToken, query.id);

  if (chatId === undefined || chatId !== integration.chatId) return;

  // The only two payloads this bot ever attaches. Anything else was not sent by
  // us, so it must not be read as an approval.
  if (query.data !== CALLBACK_CONFIRM && query.data !== CALLBACK_CANCEL) {
    logger.warn("Unrecognised callback payload", { data: query.data });
    return;
  }

  if (query.message) {
    await clearReplyMarkup(botToken, chatId, query.message.message_id);
  }

  const session = await readAgentSession(integration.userId, chatId);
  const pending = parsePendingAction(session.pendingAction);

  if (!pending) {
    await sendMessage(botToken, chatId, MESSAGES.nothingPending);
    return;
  }

  await resolveConfirmation(
    integration,
    botToken,
    chatId,
    pending,
    query.data === CALLBACK_CONFIRM,
    requestOrigin,
  );
}

/**
 * Execute or discard the pending action.
 *
 * The action is cleared **before** it runs. If the write then fails, the user
 * gets an error and can ask again — whereas clearing afterwards would leave a
 * confirmed action armed on a crash, and a retry could apply it twice.
 */
async function resolveConfirmation(
  integration: TelegramIntegration,
  botToken: string,
  chatId: number,
  pending: PendingAction,
  confirmed: boolean,
  requestOrigin: string,
): Promise<void> {
  const session = await readAgentSession(integration.userId, chatId);

  await writeAgentSession(integration.userId, chatId, {
    ...session,
    pendingAction: null,
    pendingActionAt: null,
  });

  if (!confirmed) {
    await sendMessage(botToken, chatId, MESSAGES.cancelled);
    return;
  }

  const reply = await applyPendingAction(
    integration.userId,
    resolveSelfOrigin(requestOrigin),
    pending,
  );

  await sendMessage(botToken, chatId, reply);
}

/**
 * Session state is stored as JSON text, so both parsers tolerate garbage: a
 * document written by an older shape must degrade to "no history" rather than
 * take the bot offline for that chat.
 */
function parseHistory(transcript: string): ChatCompletionMessageParam[] {
  try {
    const parsed: unknown = JSON.parse(transcript);
    return Array.isArray(parsed) ? (parsed as ChatCompletionMessageParam[]) : [];
  } catch {
    return [];
  }
}

function parsePendingAction(raw: string | null): PendingAction | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as PendingAction).tool === "string"
    ) {
      return parsed as PendingAction;
    }
  } catch {
    // Fall through.
  }

  return null;
}
