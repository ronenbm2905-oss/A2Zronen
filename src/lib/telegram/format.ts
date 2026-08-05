import type { TelegramReplyMarkup } from "./types";

/**
 * The bot's own voice — every string it says that the AI did not write.
 *
 * The split is deliberate: answers about a user's tasks are composed by the
 * model, but onboarding, refusals and failures are fixed copy. Those are exactly
 * the moments where a hallucinated instruction ("send me your token") would do
 * real damage, so they never pass through a model.
 *
 * Plain text throughout, no `parse_mode`. Task titles are user input; with HTML
 * or MarkdownV2 enabled a title containing `<` or `_` would make Telegram reject
 * the whole message, and escaping every interpolation is a bug waiting to be
 * forgotten.
 */

/** Callback payloads for the confirmation keyboard. Matched in the webhook. */
export const CALLBACK_CONFIRM = "act:confirm";
export const CALLBACK_CANCEL = "act:cancel";

export const CONFIRM_KEYBOARD: TelegramReplyMarkup = {
  inline_keyboard: [
    [
      { text: "✅ אישור", callback_data: CALLBACK_CONFIRM },
      { text: "❌ ביטול", callback_data: CALLBACK_CANCEL },
    ],
  ],
};

export const MESSAGES = {
  /** Shown to a chat that sends `/start` with no code, or a wrong one. */
  linkRequired:
    "שלום! 👋\n\n" +
    "כדי לחבר את הבוט לחשבון שלך, פתח את מסך ההגדרות באפליקציה, " +
    "העתק משם את קוד החיבור ושלח לי אותו כך:\n\n" +
    "/start הקוד-שלך",

  linkInvalid:
    "קוד החיבור אינו תקין או שכבר נעשה בו שימוש.\n" +
    "היכנס להגדרות באפליקציה, לחץ על «חיבור מחדש» וקבל קוד חדש.",

  linked: (name: string | null) =>
    `${name ? `היי ${name}! ` : ""}הבוט חובר בהצלחה לחשבון שלך. ✅\n\n` +
    "אפשר לדבר איתי בשפה חופשית. למשל:\n" +
    "• תיצור לי משימה למחר לשלוח דוח\n" +
    "• מה נשאר לי לעשות היום?\n" +
    "• אילו משימות עדיין פתוחות?\n" +
    "• תעדכן את המשימה האחרונה לדחיפות גבוהה\n\n" +
    "לרשימת הפקודות: /help",

  /**
   * A chat that is not the linked one. Says nothing about whose account the bot
   * belongs to — the bot is publicly addressable by anyone who knows its handle.
   */
  unauthorized:
    "הבוט הזה כבר מחובר לחשבון אחר ואינו זמין לשימוש.",

  help:
    "אני העוזר האישי שלך לניהול משימות. פשוט כתוב לי מה צריך:\n\n" +
    "📝 יצירה — «תיצור משימה להתקשר ללקוח מחר»\n" +
    "✏️ עדכון — «תעדכן את המשימה לדחיפות גבוהה»\n" +
    "🗑️ מחיקה — «תמחק את המשימה האחרונה»\n" +
    "🔍 חיפוש — «אילו משימות פתוחות יש בפרויקט שיווק?»\n" +
    "📊 סיכום — «מה המצב שלי היום?»\n\n" +
    "לפני כל שינוי אבקש ממך אישור.\n\n" +
    "פקודות:\n" +
    "/help — ההודעה הזו\n" +
    "/reset — ניקוי ההקשר של השיחה",

  reset: "ההקשר של השיחה נוקה. אפשר להתחיל מחדש. 🧹",

  cancelled: "בוטל. לא בוצע שום שינוי.",

  nothingPending: "אין כרגע פעולה שממתינה לאישור.",

  aiUnavailable:
    "שירות ה-AI אינו זמין כרגע. אם זה נמשך, בדוק שמפתח OpenAI מוגדר בשרת.",

  rateLimited:
    "קצב ההודעות גבוה מדי. המתן רגע ונסה שוב. ⏳",

  unsupported:
    "אני יודע לקרוא טקסט בלבד. שלח לי הודעה כתובה ואשמח לעזור.",

  failure:
    "משהו השתבש בעיבוד ההודעה. נסה שוב, ואם זה חוזר — בדוק את מסך ההגדרות באפליקציה.",
} as const;

/** `/start ABC` → `"ABC"`; `/help@my_bot` → command with no argument. */
export function parseCommand(
  text: string,
): { command: string; argument: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  const [head, ...rest] = trimmed.split(/\s+/);
  // Telegram appends `@botname` to commands sent in groups.
  const command = head.slice(1).split("@")[0].toLocaleLowerCase();

  return { command, argument: rest.join(" ").trim() };
}
