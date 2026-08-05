# Project Overview

## Overview

a2z הוא מנהל משימות רב-דיירי (multi-tenant) בעברית RTL, בנוי על **Next.js 16.3** (App Router), **React 19.2**, **Firebase** (Auth + Firestore), **TanStack Query v5**, **Zod v4** ו-**Tailwind v4** עם פרימיטיבים של shadcn מעל `@base-ui/react`. מאז שלב 4 יש לו ממשק שני: **בוט Telegram מונע OpenAI** ([[telegram-integration]], [[ai-agent]]).

הארכיטקטורה נשענת על שלוש החלטות שחוזרות בכל שכבה:

1. **API-first לכתיבה.** כל מוטציה עוברת דרך `/api/v1/*`, שמאמת Firebase ID token ומשתמש ב-Admin SDK. הדפדפן **לעולם** לא כותב ל-Firestore ישירות — וזה נאכף בבסיס הנתונים עצמו (`allow write: if false` ב-`firestore.rules`), לא רק בקוד.
2. **Realtime לקריאה.** קריאות מגיעות ישירות מהדפדפן דרך `onSnapshot`, עם חוקי Firestore שמכריחים כל שאילתה לשאת `where("userId", "==", uid)`. הגשר ל-React Query נמצא ב-[[data-fetching-query]].
3. **בידוד דיירים מבני.** `uid` מגיע רק מ-`requireUser()` ואף פעם לא מגוף הבקשה. כל service מקבל אותו כארגומנט ראשון; קריאת מסמך בודד שלא שייך למשתמש מחזירה **404 ולא 403** כדי לא לאשר קיום.

### זרימת נתונים

```
כתיבה:  component → hook (useMutation) → apiFetch → /api/v1/* → requireUser → service → Admin SDK → Firestore
קריאה:  Firestore → onSnapshot (Web SDK) → services/client → useRealtimeCollection → React Query cache → component
Telegram: Telegram → webhook (secret) → telegram-agent.service → lib/ai → /api/v1/* → …אותו מסלול כתיבה
```

שימו לב לשורה השלישית: ה-agent **חוזר דרך ה-HTTP** במקום לקצר ל-service. זה עולה
round-trip ומקנה לו בתמורה את `requireUser`, את סכמות ה-Zod ואת בדיקות הבעלות
בלי מימוש שני שלהן. הטוקן נטבע מה-uid דרך Admin SDK + Identity Toolkit — ראה
[[ai-agent]].

### מפת שכבות

| שכבה | תיקייה | תפקיד | תיעוד |
|---|---|---|---|
| Routes | `src/app` | route groups, layouts, metadata | [[app-routing]] |
| API | `src/app/api`, `src/lib/api` | endpoints, envelope, שגיאות | [[api-routes]], [[api-layer]] |
| UI | `src/components` | תצוגה בלבד | [[ui-primitives]], [[components-common]], [[layout-shell]] |
| Hooks | `src/hooks` | state, מוטציות, נגזרות | [[hooks]] |
| API client | `src/lib/api-client` | fetch + token | [[api-client]] |
| Services | `src/services` | לוגיקה עסקית ו-persistence | [[services-server]], [[services-client]] |
| Infra | `src/lib/firebase`, `src/config` | SDK, env | [[firebase-integration]], [[config-env]] |
| Contracts | `src/types`, `src/lib/schemas` | טיפוסים וולידציה | [[types-domain]], [[schemas-validation]] |
| Integrations | `src/lib/telegram`, `src/lib/ai` | בוט ו-agent, שרת בלבד | [[telegram-integration]], [[ai-agent]] |

### דומיין

שש קולקציות ב-Firestore. ארבע הן דומיין, כולן top-level עם שדה `userId`: `tasks`,
`projects`, `tags`, `users` — בעלות היא **predicate בשאילתה**, לא מקטע נתיב.
שתיים נוספו בשלב 4 ו**דחויות לדפדפן לחלוטין**: `integrations` (טוקן בוט מוצפן)
ו-`agentSessions` (תמליל השיחה).

פיצ'רים: [[tasks-feature]], [[projects-feature]], [[tags-feature]], [[dashboard-feature]], [[settings-feature]], [[auth]], [[marketing-site]], [[telegram-integration]].

### מוסכמות חוצות-קוד

- **עברית היא שכבת תצוגה.** ערכי enum נשמרים באנגלית snake_case (`in_progress`); התוויות בעברית חיות ב-[[constants]] וב-`messages.he.ts` ([[errors-handling]]).
- **חותמות זמן הן `ISODateString`** בכל גבול מעל שכבת ה-service. `Timestamp` של Firestore לא דולף — ראה [[firebase-integration]].
- **`""` ולא `null`** לשדות טקסט ריקים (`description`).
- **אין פורמט תאריך ב-Server Component** — `Intl` פותר לפי אזור הזמן של השרת ויוצר hydration mismatch. ראה [[utils]].
- **כל איחוד סגור מגובה במערך `const`** כדי ש-Zod, ה-`<select>` ומפות התוויות יקראו ממקור אחד.
- **סוד שהמערכת שומרת בשביל משתמש נשמר מוצפן ולא חוזר ללקוח** — נאכף בטיפוס
  ההחזרה, לא רק בקוד ה-handler. ראה [[telegram-integration]].

## Open Questions
- החוקים והאינדקסים נפרסו ל-`a2zronen` ב-2026-08-05 ([[firebase-env-setup]]); כל שאילתה חדשה עם `where` + `orderBy` תדרוש אינדקס נוסף ופריסה מחדש.
- `README.md` הוא עדיין ה-boilerplate של `create-next-app` ולא מתאר את המערכת הזו.
- אין בפרויקט שום קובץ בדיקות ואין test runner ב-`package.json`.
- `PaginationParams` ו-`Paginated<T>` מוגדרים ב-[[types-domain]] אך אף endpoint לא משתמש בהם — pagination טרם מומש.
- העבודה כולה יושבת על commit יחיד (`c1142f6`) עם עץ עבודה גדול שלא נכנס ל-git.

## Session Log

### 2026-08-05 — מיפוי ארכיטקטורה ראשוני [shipped]
- **What was done:** מיפוי מלא של 188 קבצי מקור ל-28 מודולים מתועדים; תיעוד זרימת הנתונים, מפת השכבות והמוסכמות החוצות.
- **Decisions:** תיעוד ברמת מודול ולא קובץ-לקובץ — לפי קונבנציית "one file per topic" של הסקיל ולפי בחירת המשתמש. כל קובץ מודול מכיל טבלה עם **כל** קבצי התחום, כך שהכיסוי לכל קובץ נשמר.
- **Notes / Caveats:** התיעוד נגזר מקריאת המקור בלבד — לא הורצה בנייה ולא שרת פיתוח, ולכן לא נבדק שהמערכת אכן עולה.
- **Related:** [[app-routing]], [[api-layer]], [[services-server]], [[firebase-integration]], [[data-fetching-query]], [[types-domain]]

### 2026-08-05 — שלב 4: ממשק שני [shipped]
- **What was done:** הארכיטקטורה הורחבה בממשק Telegram+AI מבלי לשנות שכבה קיימת. נוספו שני מודולי `lib` (`telegram`, `ai`), שני services, שלושה endpoints, hook וכרטיס הגדרות; שתי קולקציות חדשות דחויות ללקוח.
- **Decisions:** ה-agent נכנס דרך ה-HTTP של `/api/v1` ולא דרך שכבת ה-service — הכלל "כל כתיבה עוברת ב-API" נשמר בלי חריג שני (הראשון הוא שינוי סיסמה, ראה [[settings-feature]]). מוסכמה חדשה חוצת-קוד: סוד של משתמש נשמר מוצפן ולא חוזר ללקוח, ונאכף בטיפוס.
- **Notes / Caveats:** ה-`.env` דורש עכשיו `OPENAI_API_KEY` ו-`SECRET_ENCRYPTION_KEY`; ה-Bot Token במכוון **אינו** משתנה סביבה.
- **Related:** [[telegram-integration]], [[ai-agent]], [[api-routes]], [[services-server]], [[config-env]], [[firebase-integration]], [[settings-feature]]
