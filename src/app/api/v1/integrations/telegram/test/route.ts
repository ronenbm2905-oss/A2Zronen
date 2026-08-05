import type { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { testTelegramConnection } from "@/services/server";

export const dynamic = "force-dynamic";

/**
 * "Test connection" — and repair it where possible.
 *
 * It re-verifies the stored token with `getMe`, re-registers the webhook if it
 * is missing, and pings the linked chat. It is `POST` rather than `GET` because
 * it changes state at Telegram and sends a message; a button that quietly
 * reconfigures a webhook has no business being idempotent-looking.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const { uid } = await requireUser(request);

  enforceRateLimit(`telegram:test:${uid}`, RATE_LIMITS.telegramConnect);

  return testTelegramConnection(uid, request.nextUrl.origin);
});
