import type { NextRequest } from "next/server";

import { isSecretEncryptionConfigured } from "@/config/server-env";
import { forgetAgentToken } from "@/lib/ai";
import { parseJsonBody, withApiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { connectTelegramSchema } from "@/lib/schemas";
import {
  connectTelegram,
  disconnectTelegram,
  getTelegramStatus,
} from "@/services/server";

export const dynamic = "force-dynamic";

/**
 * The user's Telegram bot.
 *
 * `GET` returns {@link TelegramIntegrationStatus}, which has no field a bot
 * token could occupy — there is deliberately no endpoint that reads one back.
 * Once submitted, a token only ever travels from Firestore to `api.telegram.org`.
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { uid } = await requireUser(request);

  return getTelegramStatus(uid);
});

/**
 * Save a bot token.
 *
 * The encryption gate is checked *before* the body is read: without a key the
 * token could only be stored in the clear, and the one thing that must never
 * happen is accepting a secret we cannot protect. Failing here means the token
 * never enters a variable in this process.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const { uid } = await requireUser(request);

  if (!isSecretEncryptionConfigured) {
    throw AppError.config(
      "SECRET_ENCRYPTION_KEY חסר בשרת, ולכן לא ניתן לשמור את ה-Token בצורה מאובטחת.",
    );
  }

  enforceRateLimit(`telegram:connect:${uid}`, RATE_LIMITS.telegramConnect);

  const input = await parseJsonBody(request, connectTelegramSchema);

  return connectTelegram(uid, input, request.nextUrl.origin);
});

export const DELETE = withApiHandler(async (request: NextRequest) => {
  const { uid } = await requireUser(request);

  // Drop the minted ID token too. It would expire on its own within the hour,
  // but "disconnect" should not leave a credential for this account sitting in
  // process memory afterwards.
  forgetAgentToken(uid);

  return disconnectTelegram(uid);
});
