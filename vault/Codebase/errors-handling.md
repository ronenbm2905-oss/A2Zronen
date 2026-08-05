# Errors & Logging

## Overview

טיפול בשגיאות בנוי סביב מחלקה אחת (`AppError`) וקבוצה סגורה של קודים. הכלל: **קוד השגיאה הוא חלק מהחוזה הציבורי של ה-API** — לקוחות מסתעפים עליו, ולכן שינוי שם הוא שינוי שובר.

שכבת התרגום נפרדת בכוונה. `error-codes.ts` מחזיק הודעות **באנגלית** כברירת מחדל טכנית; `messages.he.ts` ממפה קוד → הודעה **בעברית** להצגה למשתמש. כך שההודעה שנרשמת ללוג וההודעה שהמשתמש רואה אינן אותו דבר.

`AppError.from()` הוא הנקודה שבה כל דבר שנזרק — Error רגיל, שגיאת Zod, שגיאת Firebase — הופך לצורה אחידה עם `status` ו-`isOperational`. `withApiHandler` ב-[[api-layer]] הוא הצרכן היחיד שלו בשרת.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/lib/errors/error-codes.ts` | `ERROR_CODES` (8 קודים: VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, CONFIG_ERROR, INTERNAL_ERROR), `ERROR_STATUS` (קוד → HTTP), `ERROR_MESSAGES` (ברירות מחדל באנגלית) | חוזה API |
| `src/lib/errors/app-error.ts` | מחלקת `AppError` עם `code`, `status`, `details`, `isOperational`, `cause`; בנאים סטטיים (`unauthorized`, `validation`, …) ו-`AppError.from()`. בנוסף `isAppError()` כ-type guard | ליבה — נצרך בכל השכבות |
| `src/lib/errors/messages.he.ts` | `ERROR_MESSAGES_HE`, `toHebrewMessage(error)` להודעות כלליות ו-`toHebrewAuthMessage(error)` שממפה קודי שגיאה של Firebase Auth (`auth/wrong-password` וכו') לעברית | תצוגה — נצרך ע"י [[auth]], [[hooks]], [[components-common]] |
| `src/lib/errors/index.ts` | barrel | גבול מודול |
| `src/lib/logger.ts` | `logger` עם `debug`/`info`/`warn`/`error`, טיפוסי `LogLevel` ו-`Logger`. עטיפה דקה סביב הקונסולה עם רמות. `serializeErrors` משטח `Error` (רקורסיבית, גם בתוך אובייקטים ומערכים) ל-`{ name, message, code, stack }` | תשתית — נצרך ע"י [[api-layer]], [[config-env]], [[services-server]], error boundaries |

### מסלול השגיאה

```
service זורק AppError
  → withApiHandler תופס
  → AppError.from() מנרמל
  → logger.warn (תפעולי, <500) או logger.error
  → apiFailure() → { success: false, error: { code, message, details } }
  → apiFetch בלקוח משחזר ל-AppError
  → toHebrewMessage() → toast / ErrorState
```

הפרט המשמעותי: **פרטים פנימיים לעולם לא מגיעים ללקוח.** כל מה שאינו `AppError` הופך ל-500 גנרי מלוגג.

## Open Questions
- `RATE_LIMITED` מוגדר אך שום דבר לא זורק אותו — אין הגבלת קצב במערכת.
- `logger` כותב לקונסולה בלבד; אין שילוב עם שירות תצפיתיות, ולכן `requestId` שנוצר ב-proxy ([[build-tooling]]) שימושי רק בלוגים מקומיים.

## Session Log

### 2026-08-05 — שיטוח Error ב-logger [shipped]
- **What was done:** נוספה `serializeErrors` ל-`src/lib/logger.ts`, שממירה `Error` לאובייקט רגיל לפני ההעברה לקונסולה.
- **Decisions:** בוצע ב-logger ולא באתר הקריאה. `message`/`stack`/`name` הן תכונות **לא-enumerable** של `Error`, ולכן כל דבר שמסריאל את ה-meta — ה-overlay של Next, `JSON.stringify`, transport עתידי — הציג שגיאה כ-`{}`. זה בדיוק מה שהסתיר `FirebaseError` עם קוד `failed-precondition`. השיטוח ב-logger הופך כל `logger.error(msg, { err })` בקוד לשימושי.
- **Notes / Caveats:** `code` נכלל רק אם קיים על האובייקט — Firebase, Node ו-DOM exceptions כולם נושאים אותו, וזה בדרך כלל השדה הפעיל ביותר.
- **Related:** [[data-fetching-query]], [[services-client]], [[firebase-env-setup]]

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד `AppError`, קבוצת הקודים, הפרדת שכבת התרגום לעברית, ומסלול השגיאה המלא מ-service ועד toast.
- **Decisions:** ה-logger תועד כאן ולא כמודול נפרד — הוא בשימוש כמעט בלעדי בתוך מסלול השגיאה.
- **Notes / Caveats:** `toHebrewAuthMessage` נפרד מ-`toHebrewMessage` כי קודי Firebase Auth הם מרחב שמות אחר לגמרי מ-`ERROR_CODES`.
- **Related:** [[api-layer]], [[api-client]], [[auth]], [[types-domain]], [[components-common]]
