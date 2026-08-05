import { ERROR_CODES, isAppError, type ErrorCode } from "./index";

/**
 * User-facing Hebrew copy for every error code.
 *
 * `ERROR_MESSAGES` in `error-codes.ts` stays English: it is what gets logged and
 * what a future API consumer reads. This map is the presentation layer, so the
 * UI never shows a raw server string.
 */
export const ERROR_MESSAGES_HE: Record<ErrorCode, string> = {
  [ERROR_CODES.VALIDATION_ERROR]: "חלק מהפרטים שהוזנו אינם תקינים. בדוק ונסה שוב.",
  [ERROR_CODES.UNAUTHORIZED]: "נדרשת התחברות כדי לבצע פעולה זו.",
  [ERROR_CODES.FORBIDDEN]: "אין לך הרשאה לגשת לתוכן הזה.",
  [ERROR_CODES.NOT_FOUND]: "הפריט המבוקש לא נמצא.",
  [ERROR_CODES.CONFLICT]: "כבר קיים פריט עם הפרטים האלה.",
  [ERROR_CODES.RATE_LIMITED]: "בוצעו יותר מדי בקשות. נסה שוב בעוד רגע.",
  [ERROR_CODES.CONFIG_ERROR]: "השרת אינו מוגדר כראוי. פנה למנהל המערכת.",
  [ERROR_CODES.INTERNAL_ERROR]: "אירעה שגיאה בלתי צפויה. נסה שוב.",
};

/**
 * Turn anything thrown anywhere in the app into a Hebrew sentence.
 *
 * `apiFetch` rethrows server failures as `AppError`, so in practice the first
 * branch handles every API error; the fallback covers Firebase SDK errors and
 * genuine bugs.
 */
export function toHebrewMessage(error: unknown): string {
  if (isAppError(error)) {
    return ERROR_MESSAGES_HE[error.code] ?? ERROR_MESSAGES_HE.INTERNAL_ERROR;
  }

  return ERROR_MESSAGES_HE.INTERNAL_ERROR;
}

/**
 * Firebase Auth reports failures as opaque codes like `auth/wrong-password`.
 * These never pass through `AppError`, because sign-in happens client-side
 * against the Firebase SDK rather than through our API.
 */
const FIREBASE_AUTH_MESSAGES_HE: Record<string, string> = {
  "auth/invalid-email": "כתובת האימייל אינה תקינה.",
  "auth/user-disabled": "החשבון הזה הושבת.",
  "auth/user-not-found": "האימייל או הסיסמה שגויים.",
  "auth/wrong-password": "האימייל או הסיסמה שגויים.",
  "auth/invalid-credential": "האימייל או הסיסמה שגויים.",
  "auth/email-already-in-use": "כתובת האימייל הזו כבר רשומה במערכת.",
  "auth/weak-password": "הסיסמה חלשה מדי. בחר סיסמה באורך 6 תווים לפחות.",
  "auth/too-many-requests": "בוצעו יותר מדי ניסיונות. נסה שוב בעוד מספר דקות.",
  "auth/network-request-failed": "בעיית תקשורת. בדוק את החיבור לאינטרנט ונסה שוב.",
  "auth/requires-recent-login": "מטעמי אבטחה יש להתחבר מחדש לפני ביצוע הפעולה.",
  "auth/popup-closed-by-user": "החלון נסגר לפני השלמת ההתחברות.",
  "auth/operation-not-allowed": "שיטת ההתחברות הזו אינה מופעלת בפרויקט.",
};

function readFirebaseErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code.startsWith("auth/") ? code : null;
}

/**
 * Hebrew copy for an error from any source: our API, Firebase Auth, or an
 * unexpected throw. This is what auth forms and toasts should call.
 */
export function toHebrewAuthMessage(error: unknown): string {
  const code = readFirebaseErrorCode(error);
  if (code) {
    return FIREBASE_AUTH_MESSAGES_HE[code] ?? "ההתחברות נכשלה. נסה שוב.";
  }

  return toHebrewMessage(error);
}
