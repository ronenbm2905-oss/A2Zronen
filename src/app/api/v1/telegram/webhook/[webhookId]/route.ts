import { after, NextResponse, type NextRequest } from "next/server";

import { safeEqual } from "@/lib/crypto/secret-box";
import { logger } from "@/lib/logger";
import { consume, RATE_LIMITS } from "@/lib/rate-limit";
import type { TelegramUpdate } from "@/lib/telegram";
import { findIntegrationByWebhookId, handleTelegramUpdate } from "@/services/server";

export const dynamic = "force-dynamic";

/**
 * Telegram's callback. The one unauthenticated endpoint in this system.
 *
 * It therefore does its own gatekeeping, and the order matters:
 *
 * 1. **The path** carries a random `webhookId`, not a uid — so the URL sitting
 *    in Telegram's configuration reveals nothing about the account behind it.
 * 2. **The header** `X-Telegram-Bot-Api-Secret-Token` is compared in constant
 *    time against the secret registered with `setWebhook`. Knowing the path is
 *    not enough; only Telegram was ever told the secret.
 * 3. **Then** the update is parsed. Nothing reads the body before the caller has
 *    proven itself.
 *
 * This route bypasses `withApiHandler` deliberately: Telegram ignores response
 * bodies and reads only the status, and the envelope's failure statuses would be
 * interpreted as "retry this update", turning one bad request into a redelivery
 * loop. Everything past authentication answers `200 {ok:true}`.
 */

type Context = RouteContext<"/api/v1/telegram/webhook/[webhookId]">;

const SECRET_HEADER = "x-telegram-bot-api-secret-token";

/**
 * Bare 200 — Telegram is told "delivered" and asked for nothing further.
 *
 * A function, not a shared constant: a `Response` body can be read once, so
 * handing the same instance to two concurrent requests breaks the second.
 */
const ack = () => NextResponse.json({ ok: true });

export async function POST(
  request: NextRequest,
  context: Context,
): Promise<NextResponse> {
  const { webhookId } = await context.params;

  const secret = request.headers.get(SECRET_HEADER);
  if (!secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Blunts a scan across guessed webhook ids, which would otherwise be a free
  // Firestore query per attempt.
  if (!consume(`tg:hook:${webhookId}`, RATE_LIMITS.telegramInbound).allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const integration = await findIntegrationByWebhookId(webhookId);

  if (!integration || !safeEqual(secret, integration.webhookSecret)) {
    // Same answer for "no such webhook" and "wrong secret": distinguishing them
    // would confirm which ids exist.
    logger.warn("Rejected Telegram webhook call", { webhookId });
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;

  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    // Malformed body from an authenticated caller: acknowledge so Telegram does
    // not redeliver something we will never be able to parse.
    return ack();
  }

  const origin = request.nextUrl.origin;

  // Answer Telegram now and think afterwards. A turn can take tens of seconds
  // (model call plus tool round-trips); holding the response open that long
  // makes Telegram time out and redeliver, and the user gets the same reply
  // twice. The bot's actual answer arrives over `sendMessage`, not over this
  // response, so nothing is lost by returning early.
  after(async () => {
    await handleTelegramUpdate(integration, update, origin).catch(
      (error: unknown) => {
        logger.error("Unhandled Telegram update failure", {
          uid: integration.userId,
          error,
        });
      },
    );
  });

  return ack();
}
