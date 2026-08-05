# Telegram Integration

## Overview

חיבור Telegram הוא **בוט אחד לכל משתמש, שהמשתמש מביא בעצמו** מ-BotFather. אין
בוט מרכזי ואין טוקן ב-`.env` — התצורה היא נתונים, לא deployment, ולכן החלפת בוט
היא הגשת טופס ולא שינוי קוד. זה מה שמקיים את הדרישה "אותה התנהגות ב-Local
וב-Production".

### שרשרת ההרשאה

זהו החתך היחיד במערכת שבו בקשה נכנסת **ללא** Firebase ID token, ולכן הוא בונה
לעצמו זהות בארבעה שלבים:

```
webhookSecret  → הבקשה באמת הגיעה מ-Telegram        (נבדק ב-route, constant-time)
webhookId      → איזה integration, ומכאן איזה uid
chatId         → הצ׳אט הזה הוא זה שתפס את הבוט
uid            → מוזרק ל-@/lib/ai שקורא ל-/api/v1 בשמו
```

**שום שדה ב-payload לא בוחר חשבון.** ה-`uid` מגיע רק ממסמך ה-integration.

### למה נדרש שלב `/start <code>`

בוט הוא כתובת ציבורית: כל מי שיודע את ה-handle יכול לכתוב אליו. החזקת ה-Token
מוכיחה שה-**בוט** שייך למשתמש, לא שהאדם שמקליד שייך לו. הקוד החד-פעמי שמוצג
במסך ההגדרות הוא מה שהופך את הראשון לשני. עד שצ׳אט נקשר, כל הודעה מקבלת את אותה
תשובה — כך שזר לומד רק שהבוט אינו מוגדר עבורו.

### אבטחת ה-Token

- נשמר מוצפן ב-AES-256-GCM (`@/lib/crypto/secret-box`) במסמך `integrations/{uid}`.
- הקולקציה **דחויה גם לבעלים** ב-`firestore.rules` — הדפדפן לא קורא אותה כלל.
- `GET /api/v1/integrations/telegram` מחזיר `TelegramIntegrationStatus`, טיפוס
  שאין בו שדה שטוקן יכול לשבת בו. **אין endpoint שמחזיר טוקן.**
- אחרי השמירה הטוקן נוסע רק מ-Firestore ל-`api.telegram.org`.

### Local מול Production

`setWebhook` דורש כתובת HTTPS ציבורית. `applyWebhook` מזהה origin שאינו נגיש
ואז **מוחק** את ה-Webhook במקום להשאיר רישום ישן — כי כל התחברות מסובבת את
`webhookSecret`, ורישום ישן היה ממשיך להביא עדכונים שה-route דוחה בצדק, והבוט היה
נראה מחובר ופשוט לא עונה. לפיתוח מקומי: מנהרה (cloudflared/ngrok) + `APP_BASE_URL`.

## Files

| קובץ | מה הוא עושה | שכבה |
|---|---|---|
| `src/types/integration.ts` | `TelegramIntegrationStatus` (הפרויקציה ללקוח) ו-`TelegramIntegration` (המסמך המאוחסן, נושא את הטוקן החתום). הפיצול הוא ההגנה עצמה | [[types-domain]] |
| `src/lib/schemas/telegram.schema.ts` | `connectTelegramSchema` — פורמט `<bot_id>:<secret>`. לא אבטחה, אלא הודעה ספציפית על הדבקה שגויה | [[schemas-validation]] |
| `src/lib/crypto/secret-box.ts` | `sealSecret` / `openSecret` (AES-256-GCM, פורמט `v1.<iv>.<tag>.<ct>`), `safeEqual` (constant-time), `randomToken` | תשתית |
| `src/lib/rate-limit.ts` | חלון קבוע בזיכרון התהליך. `RATE_LIMITS`: `telegramConnect`, `telegramInbound`, `aiTurn` | תשתית |
| `src/lib/telegram/types.ts` | מודל מינימלי של Bot API — `Update`, `Message`, `CallbackQuery`, `ReplyMarkup` | חוזה |
| `src/lib/telegram/client.ts` | הקוד היחיד שמדבר עם `api.telegram.org`: `getMe`, `sendMessage`, `setWebhook`, `deleteWebhook`, `answerCallbackQuery`, `clearReplyMarkup`, `sendTypingAction`. `TelegramApiError` נושא את `error_code` | שרת |
| `src/lib/telegram/format.ts` | **קול הבוט עצמו** — כל מחרוזת שה-AI לא כתב: onboarding, סירובים, כשלים, מקלדת האישור, `parseCommand` | שרת |
| `src/lib/telegram/index.ts` | barrel, `server-only` | גבול מודול |
| `src/services/server/integration.service.ts` | חיבור/בדיקה/ניתוק, `applyWebhook`, קישור צ׳אט, ומצב השיחה (`AgentSession`) | [[services-server]] |
| `src/services/server/telegram-agent.service.ts` | ניתוב עדכון: קישור, פקודות, אישור/ביטול, קריאה ל-agent | [[services-server]] |
| `src/app/api/v1/integrations/telegram/route.ts` | `GET` סטטוס, `POST` שמירה, `DELETE` ניתוק | [[api-routes]] |
| `src/app/api/v1/integrations/telegram/test/route.ts` | `POST` — מאמת מחדש **ומתקן** את הרישום | [[api-routes]] |
| `src/app/api/v1/telegram/webhook/[webhookId]/route.ts` | ה-endpoint הלא-מאומת. עוקף את `withApiHandler` במכוון | [[api-routes]] |
| `src/hooks/use-telegram-integration.ts` | `useTelegramIntegration` + שלוש מוטציות. `useQuery` רגיל ולא realtime — אין ל-onSnapshot מה לקרוא | [[hooks]] |
| `src/components/settings/telegram-integration.tsx` | הכרטיס: שדה write-only, Save / Test / Disconnect, קוד `/start` עם העתקה | [[settings-feature]] |

### פרטים שקל לפספס

- **Telegram מחזיר 200 גם על כישלון.** השגיאה יושבת ב-`{ok:false, description}`
  בתוך תגובה מוצלחת, ולכן `callTelegram` מסתעף על המעטפת ולא על `response.ok`.
- **ה-webhook route מחזיר 200 כמעט תמיד.** סטטוס כישלון מתפרש אצל Telegram כ"שלח
  שוב", והיה הופך בקשה אחת ללולאת redelivery. רק כשל אימות מחזיר 401.
- **`after()` מריץ את העיבוד אחרי התשובה** — תור של דקות ב-model + tools לא יחזיק
  את החיבור פתוח. התשובה לבוט נשלחת ב-`sendMessage`, לא בגוף התגובה.
- **`ack()` היא פונקציה ולא קבוע.** גוף של `Response` נקרא פעם אחת; מופע משותף
  היה נשבר בבקשה המקבילה השנייה.
- **`set` בלי merge** בהתחברות — חיבור מחדש לא יורש `chatId` מהבוט הקודם.

## Open Questions
- מגבלת הקצב יושבת בזיכרון התהליך; על פלטפורמה עם כמה instances התקרה בפועל היא
  `limit × instances`. שדרוג = חנות משותפת, ורק החתימה של `consume` משתנה.
- אומת מקצה-לקצה ב-2026-08-05 מול `@ronen2905bot`, אך דרך ריליי `getUpdates`
  מקומי ולא דרך דליברי אמיתי של Telegram. `setWebhook` עצמו עדיין לא נבדק בשטח —
  נדרשת מנהרה ציבורית ו-`APP_BASE_URL`.
- `agentSessions` נמחקות רק בניתוק או ב-`/reset`; אין TTL על שיחות נטושות.
- קוד ה-`/start` תקף 24 שעות; לא נבדק מה קורה כשמשתמש לוחץ «שמירה» פעמיים ומקבל
  קוד חדש בזמן שהישן עדיין בדרך ל-Telegram.

## Session Log

### 2026-08-05 — שלב 4: חיבור Telegram [shipped]
- **What was done:** נבנתה שכבת ה-Telegram במלואה — טיפוסים, סכמה, secret-box,
  rate limiter, לקוח Bot API, שירות integration, שלושה endpoints, hook וכרטיס
  הגדרות. `firestore.rules` נסגר על `integrations` ו-`agentSessions`.
- **Decisions:** (1) הטוקן לעולם לא חוזר ללקוח — נאכף בטיפוס `TelegramIntegrationStatus`
  ולא רק בקוד ה-handler. (2) ה-webhook מזוהה ב-`webhookId` אקראי ולא ב-uid, כדי
  שה-URL שיושב בתצורת Telegram לא יסגיר את החשבון. (3) `deleteWebhook` כשה-origin
  אינו נגיש — אחרת סיבוב הסוד היה משאיר רישום ישן והבוט היה "מחובר ואילם".
  (4) שלב `/start <code>` נפרד מהשמירה, כי טוקן מוכיח בעלות על הבוט ולא על הצ׳אט.
- **Notes / Caveats:** `SECRET_ENCRYPTION_KEY` נוצר ונוסף ל-`.env.local` בסשן הזה.
  סיבוב שלו מבטל כל טוקן שמור — המשתמשים יצטרכו לחבר מחדש. אומת: `/api/health`
  מחזיר את שני הדגלים החדשים כ-`true`, ה-endpoints מחזירים 401 ללא טוקן, וה-webhook
  מחזיר `{ok:false}` 401 גם ל-secret חסר וגם לשגוי. **המסך עצמו לא נצפה מחובר** —
  נדרשת התחברות.
- **Related:** [[ai-agent]], [[settings-feature]], [[api-routes]], [[services-server]], [[firebase-integration]], [[config-env]], [[types-domain]], [[schemas-validation]], [[hooks]]

### 2026-08-05 — אימות מול בוט אמיתי, בלי שינוי קוד [shipped]
- **What was done:** אומת בשטח — לא נגעתי בקוד. חיבור בוט אמיתי דרך מסך ההגדרות
  הפיק מסמך `integrations` תקין; `getMe` עבר, הפענוח של `botTokenSealed` עבר,
  ו-`getWebhookInfo` החזיר `url: (none)` **כצפוי** — `applyWebhook` מחק את הרישום
  כי `APP_BASE_URL` לא מוגדר. ריליי `getUpdates` הזרים שישה עדכונים אמיתיים
  ל-route: `/start <code>` קישר את הצ׳אט (`chatId` נכתב, `linkCode` נצרך), שתי
  בקשות בעברית עברו את מקלדת האישור ויצרו משימות עם תאריך יעד נכון לפי
  `Asia/Jerusalem`. כל השישה `200 {ok:true}`.
- **Decisions:** אין. הסשן היה אימות בלבד — כל ההתנהגות שנצפתה תאמה את מה שכבר
  מתועד למעלה, כולל ה"מחובר ואילם" שהוא התוצאה המכוונת של המחיקה.
- **Notes / Caveats:** `getUpdates` ו-webhook רשום הם **בלעדיים זה לזה** — ברגע
  שתירשם מנהרה, כלי הריליי יחזיר 409. השורה ב-Files על `deleteWebhook` הוכחה
  בפועל: בלעדיה הבוט היה נראה מחובר ושותק בלי שום סימן.
- **Related:** [[ai-agent]], [[api-routes]], [[services-server]], [[config-env]], [[tasks-feature]], [[stage-4-telegram-ai]]
