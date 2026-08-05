# Schemas & Validation

## Overview

`src/lib/schemas` מחזיק את סכמות ה-Zod שמאמתות **כל קלט** שנכנס למערכת. אותה סכמה משמשת בשני מקומות: בטופס בצד הלקוח (דרך `useZodForm` ב-[[hooks]]) ובנתיב ה-API בצד השרת (דרך `parseJsonBody` ב-[[api-layer]]). זו הסיבה שטופס לא יכול לקבל קלט שה-API ידחה.

שתי החלטות מבניות:

- **סכמות עדכון הן `.strict()`** — payload שנושא שדה לא צפוי (למשל `userId`) הוא 400. זה מה שהופך את "אי אפשר להשתיל בעלות" לכלל שנאכף ולא לכוונה.
- **מגבלות האורך מגיעות מ-[[constants]]** (`LIMITS`), לא ממספרי קסם — אותם ערכים מזינים גם את `maxLength` ומוני התווים ב-UI.

הודעות השגיאה בסכמות כתובות **בעברית**, כי הן מוצגות ישירות למשתמש מתחת לשדה.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/lib/schemas/common.schema.ts` | אבני בניין משותפות: `idSchema`, `colorTokenSchema` (מ-`COLOR_TOKENS`), `requiredText(max)`, `limitedText(max)`, `nullableIsoDate`, `csvOf(values)` ו-`csvOfIds` לפרסינג רשימות מ-query params | בסיס — נצרך ע"י כל שאר הסכמות |
| `src/lib/schemas/auth.schema.ts` | `loginSchema`, `registerSchema`, `forgotPasswordSchema`, `changePasswordSchema`, `updateProfileSchema` + טיפוסי `Input` נגזרים | [[auth]], [[settings-feature]] |
| `src/lib/schemas/task.schema.ts` | `createTaskSchema`, `updateTaskSchema` (strict, partial), `taskFilterSchema` לפרסינג search params | [[tasks-feature]], [[api-routes]] |
| `src/lib/schemas/project.schema.ts` | `createProjectSchema`, `updateProjectSchema` | [[projects-feature]] |
| `src/lib/schemas/tag.schema.ts` | `createTagSchema`, `updateTagSchema` | [[tags-feature]] |
| `src/lib/schemas/telegram.schema.ts` | `connectTelegramSchema` / `telegramBotTokenSchema` — פורמט `<bot_id>:<secret>` | [[telegram-integration]] |
| `src/lib/schemas/index.ts` | barrel לכל הסכמות ולטיפוסים הנגזרים | גבול מודול |

### מה שווה לדעת

- **`csvOf` / `csvOfIds`** קיימים כי `taskFilterSchema` מפרסר את מצב המסננים מה-URL, שם מערכים מיוצגים כמחרוזת מופרדת בפסיקים.
- **`registerSchema` ו-`changePasswordSchema` משתמשות ב-`.refine`** לאימות התאמת סיסמאות — ולכן הן `ZodEffects` ולא `ZodObject`, מה שמגביל שרשור `.partial()` עליהן.
- **הטיפוסים הנגזרים** (`CreateTaskInput` וכו') הם החוזה שעובר בין הטופס, ה-hook, ה-endpoint וה-service — כך שאין שכפול הגדרות.
- **`telegramBotTokenSchema` אינה אבטחה.** האימות האמיתי הוא `getMe` מול Telegram; ה-regex קיים כדי שהדבקה שגויה תקבל הודעה ספציפית מתחת לשדה במקום round-trip שחוזר "ה-Token אינו תקף".
- **הסכמות של ה-agent אינן כאן.** הכלים ב-[[ai-agent]] מאמתים את פלט המודל בסכמות Zod מקומיות ב-`tools.ts`, כי הן מתארות ארגומנטים של כלי ולא קלט של משתמש — צורות שונות, מחזורי חיים שונים.

## Open Questions
- לא ברור אם `taskFilterSchema` מכסה את כל השדות של `TaskFilter` ב-[[types-domain]]; שווה בדיקה מול `useTaskFilters` לפני הוספת מסנן חדש.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד שש סכמות הקלט, השימוש הכפול (טופס + endpoint), ותפקיד `.strict()` באכיפת בעלות.
- **Decisions:** הודעות בעברית נשארות בתוך הסכמות ולא בקובץ תרגום נפרד — הן צמודות לשדה ולא לקוד שגיאה, בשונה מ-[[errors-handling]].
- **Notes / Caveats:** `csvOf` הוא הפריט הפחות מובן מאליו כאן; הוא קיים אך ורק בשביל round-trip של מסננים דרך ה-URL.
- **Related:** [[types-domain]], [[api-layer]], [[hooks]], [[constants]], [[tasks-feature]]
