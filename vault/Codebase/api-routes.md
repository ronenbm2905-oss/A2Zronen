# API Routes

## Overview

שטח ה-HTTP של המערכת. כל הנתיבים תחת `/api/v1/*` ומסומנים `export const dynamic = "force-dynamic"` — הם קוראים כותרת `authorization` ולכן לעולם אינם ניתנים לרינדור סטטי.

כל handler בנוי לפי אותה תבנית משכבת [[api-layer]]: `withApiHandler` עוטף, `requireUser` מאמת, סכמת Zod מאמתת, ו-service מ-[[services-server]] עושה את העבודה. ה-handlers עצמם דקים במכוון — אין בהם לוגיקה עסקית.

**זהו נתיב הכתיבה היחיד במערכת.** הדפדפן קורא ישירות מ-Firestore אבל אף פעם לא כותב — ראה [[firebase-integration]].

## Files

| קובץ | Endpoints | מה הוא עושה | שייך ל־ |
|---|---|---|---|
| `src/app/api/health/route.ts` | `GET /api/health` | בדיקת בריאות: שם ו-גרסת האפליקציה, `appEnv`, ודגלי `isFirebaseConfigured` / `isFirebaseAdminConfigured`. **לא** דורש אימות | תפעול — [[config-env]] |
| `src/app/api/v1/auth/bootstrap/route.ts` | `POST` | יוצר את מסמך המראה `users/{uid}` בהתחברות ראשונה, דרך `bootstrapUser` | [[auth]] |
| `src/app/api/v1/me/route.ts` | `GET`, `PATCH` | קורא ומעדכן את פרופיל המשתמש. ה-`PATCH` מעדכן גם את Firebase Auth וגם את מסמך המראה באותה קריאה, כדי שלא ייפרדו | [[settings-feature]] |
| `src/app/api/v1/tasks/route.ts` | `GET`, `POST` | רשימת משימות (עם `taskFilterSchema` דרך `parseSearchParams`) ויצירת משימה | [[tasks-feature]] |
| `src/app/api/v1/tasks/[id]/route.ts` | `GET`, `PATCH`, `DELETE` | משימה בודדת. אי-התאמת בעלות מוחזרת כ-**404** ולא 403 | [[tasks-feature]] |
| `src/app/api/v1/projects/route.ts` | `GET`, `POST` | רשימת פרויקטים ויצירה | [[projects-feature]] |
| `src/app/api/v1/projects/[id]/route.ts` | `GET`, `PATCH`, `DELETE` | פרויקט בודד | [[projects-feature]] |
| `src/app/api/v1/tags/route.ts` | `GET`, `POST` | רשימת תגיות ויצירה | [[tags-feature]] |
| `src/app/api/v1/tags/[id]/route.ts` | `GET`, `PATCH`, `DELETE` | תגית בודדת | [[tags-feature]] |
| `src/app/api/v1/integrations/telegram/route.ts` | `GET`, `POST`, `DELETE` | מצב החיבור, שמירת Bot Token, ניתוק. ה-`POST` בודק את גייט ההצפנה **לפני** שהוא קורא את הגוף — סוד שאי אפשר להגן עליו לא ייכנס למשתנה | [[telegram-integration]] |
| `src/app/api/v1/integrations/telegram/test/route.ts` | `POST` | מאמת מחדש **ומתקן** את רישום ה-Webhook. `POST` ולא `GET` כי הוא משנה מצב אצל Telegram ושולח הודעה | [[telegram-integration]] |
| `src/app/api/v1/telegram/webhook/[webhookId]/route.ts` | `POST` | ה-callback של Telegram — **ה-endpoint היחיד ללא `requireUser`** | [[telegram-integration]] |

### מוסכמות

- **`Context` מוגדר מקומית** בכל נתיב `[id]` ומועבר כגנריק ל-`withApiHandler<Context>` — כך ש-`context.params` מוקלד.
- **אין endpoint שקורא `userId` מגוף הבקשה.** הוא תמיד מגיע מ-`requireUser(request).uid`.
- **מפת ה-endpoints בצד הלקוח** נמצאת ב-[[api-client]] (`endpoints`), כך ששינוי נתיב מתבצע בשני מקומות בלבד.

### החריג היחיד: ה-webhook

נתיב ה-webhook הוא הנתיב היחיד ש**אינו** משתמש ב-`withApiHandler`, וזו החלטה ולא
פספוס. Telegram מתעלם מגוף התגובה וקורא רק את הסטטוס, ולכן סטטוס כישלון של
המעטפת היה מתפרש כ"שלח את העדכון שוב" והופך בקשה אחת ללולאת redelivery. אחרי
שלב האימות הנתיב מחזיר תמיד `200 {ok:true}`, והעיבוד עצמו רץ ב-`after()` — התשובה
למשתמש נשלחת ב-`sendMessage`, לא בגוף התגובה. האימות עצמו מתבצע על כותרת
`X-Telegram-Bot-Api-Secret-Token` בהשוואת זמן-קבוע.

## Open Questions
- `GET /api/health` לא מוגן — הוא חושף את מצב תצורת ה-Firebase וה-AI לכל מי שמבקש. סביר לשלב זה, שווה בדיקה מחדש לפני production.
- אין endpoint למחיקת חשבון, אף ש-[[settings-feature]] מכיל `account-actions.tsx`.
- הגבלת הקצב הוטמעה בשלושת נתיבי Telegram בלבד (`@/lib/rate-limit`), ולא ב-`withApiHandler`; שאר ה-API עדיין ללא הגבלה.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** מיפוי תשעת קבצי הנתיב, ה-HTTP methods שלהם, וה-services שהם מפעילים.
- **Decisions:** הנתיבים תועדו בנפרד מ-[[api-layer]] — התשתית יציבה, שטח ה-endpoints הוא מה שמשתנה עם כל פיצ'ר.
- **Notes / Caveats:** החזרת 404 במקום 403 היא החלטה מכוונת (לא לאשר קיום משאב של משתמש אחר) ולא באג.
- **Related:** [[api-layer]], [[services-server]], [[auth]], [[api-client]], [[schemas-validation]]

### 2026-08-05 — שלושה נתיבים לשלב 4 [shipped]
- **What was done:** נוספו `integrations/telegram` (GET/POST/DELETE), `integrations/telegram/test` (POST) ו-`telegram/webhook/[webhookId]` (POST). `GET /api/health` הורחב בשני דגלים: `openaiConfigured`, `secretEncryptionConfigured`.
- **Decisions:** ה-webhook עוקף את `withApiHandler` במכוון — סטטוס כישלון היה גורם ל-Telegram לשלוח שוב. גם "אין webhook כזה" וגם "סוד שגוי" מקבלים 401 זהה, כדי לא לאשר אילו מזהים קיימים.
- **Notes / Caveats:** אומת בדפדפן — שני נתיבי ההגדרות מחזירים 401 עם המעטפת, וה-webhook מחזיר `{ok:false}` 401 גם ללא כותרת וגם עם סוד שגוי.
- **Related:** [[telegram-integration]], [[ai-agent]], [[config-env]], [[services-server]]
