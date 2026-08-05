import { z } from "zod";

/**
 * Bot token shape, as BotFather issues it: `<bot_id>:<35-char secret>`.
 *
 * Validating the format client-side is not security — the server re-validates
 * and, more to the point, asks Telegram itself via `getMe`. It is there so an
 * obvious paste error ("I copied the bot *name*") gets a specific Hebrew message
 * under the field instead of a round-trip that comes back "the token is invalid".
 */
const BOT_TOKEN_PATTERN = /^\d{5,}:[A-Za-z0-9_-]{30,}$/;

export const telegramBotTokenSchema = z
  .string()
  .trim()
  .min(1, "יש להזין את ה-Token של הבוט")
  .max(200, "עד 200 תווים")
  .regex(
    BOT_TOKEN_PATTERN,
    "ה-Token אינו בפורמט הנכון. העתק אותו מ-BotFather במלואו (למשל 123456789:ABC…)",
  );

export const connectTelegramSchema = z.object({
  botToken: telegramBotTokenSchema,
});

export type ConnectTelegramInput = z.infer<typeof connectTelegramSchema>;
