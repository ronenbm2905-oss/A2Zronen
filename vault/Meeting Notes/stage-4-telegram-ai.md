# Stage 4 — Telegram & AI Agent

## Overview

שלב 4 הוסיף למערכת **ממשק שני**: בוט Telegram שכל משתמש מביא מ-BotFather, מונע
על ידי OpenAI עם tool calling. המטרה המוצהרת הייתה להפוך את Telegram לממשק
העבודה העיקרי — מבלי לשנות את הארכיטקטורה הקיימת.

זה קרה: אף שכבה קיימת לא שונתה. השלב נוסף כלפי מעלה בלבד — שני מודולי `lib`
(`telegram`, `ai`), שני services, שלושה endpoints, hook אחד וכרטיס הגדרות אחד.

### שלוש ההחלטות שקבעו את שאר העיצוב

1. **ה-agent חוזר דרך ה-HTTP.** הקיצור המתבקש היה לקרוא ישירות ל-`@/services/server`
   — import אחד, בלי round-trip. במקום זה `@/lib/ai` טובע Firebase ID token לכל
   uid וקורא ל-`/api/v1` כמו כל לקוח. העלות היא latency; התמורה היא שה-agent יורש
   את `requireUser`, את סכמות ה-Zod, את `assertReferencesOwned` ואת כלל
   404-ולא-403 **בלי מימוש שני של אף אחד מהם**.

2. **האישור נאכף ב-loop, לא ב-prompt.** `create_task` / `update_task` /
   `delete_task` מוצהרים למודל אבל נחסמים לפני הרצה: נבנית תצוגה מקדימה
   מה-**ארגומנטים**, הפעולה נשמרת, והתור נעצר. אי אפשר לשכנע מודל לדלג על משהו
   שהוא לא מי שמחליט להריץ. ה-prompt דווקא **אוסר** על המודל לשאול, כדי שהמשתמש
   לא ייחקר פעמיים על אותה פעולה.

3. **הטוקן הוא נתון, לא תצורה.** אין `TELEGRAM_BOT_TOKEN` ב-`.env`. הוא מגיע
   מהטופס, נשמר מוצפן ב-Firestore, ולא חוזר ללקוח לעולם — נאכף בטיפוס ההחזרה
   (`TelegramIntegrationStatus`), לא בזהירות של מי שכותב handler. זו גם הסיבה
   ש"החלפת בוט בלי שינוי קוד" עובדת, ושהתנהגות Local ו-Production זהה.

### שרשרת ההרשאה של הבקשה הלא-מאומתת

ה-webhook הוא ה-endpoint היחיד ללא `requireUser`, ולכן הוא בונה זהות בעצמו:

```
webhookSecret (header, constant-time) → הבקשה מ-Telegram
webhookId (path, אקראי ולא uid)       → איזה integration, ומכאן איזה uid
chatId                                → הצ׳אט הזה תפס את הבוט ב-/start <code>
```

## Open Questions
- **זמן תגובה בפרודקשן לא נמדד.** `minInstances: 0` פירושו cold start, והעבודה
  רצה ב-`after()` — כלומר אחרי שהתשובה נשלחה, כשהקצאת ה-CPU ב-Cloud Run עשויה
  להיחנק. המשתמש שלח את אותה בקשה פעמיים ב-2026-08-06 כי לא ראה תשובה בזמן.
  לא נמדד ולא הוכח; אם יאושש, המחיר הוא `minInstances: 1` או CPU always-allocated.
- החוקים החדשים ב-`firestore.rules` לא נפרסו. לא חוסם (ה-default deny כבר מכסה),
  אבל שווה פריסה.
- **ל-backend יש משתני סביבה ברמת הקונסולה שגוברים על `apphosting.yaml`**, ואחד
  מהם הוא `NEXT_PUBLIC_APP_ENV=development`. לנקות אותם כדי שהקובץ יהיה מקור
  יחיד — ראה [[config-env]].
- **`OPENAI_API_KEY` כתוב ב-`.env.local` באותיות קטנות** (`openai_api_key`). עובד
  רק כי `process.env` ב-Windows אינו רגיש לרישיות; פריסה ל-Linux תשבור את ה-agent
  בשקט. לתקן לפני deploy.
- משימה ישנה (`לנקות את החצר`, נוצרה 18:11 מחוץ לזרימת הבוט) נושאת `dueDate`
  שלילי — `-2000946040` שניות, כלומר 1906. מקור לא ידוע; לא נגרם ע"י הבוט.
- אין תקרת עלות מצטברת פר-משתמש מול OpenAI, רק חלון של 30 תורות ל-5 דקות.
- הגבלת הקצב יושבת בזיכרון התהליך; מעל instance אחד התקרה היא `limit × instances`.
- הכלים מכסים משימות בלבד — יצירת פרויקט או תגית דרך הבוט אינה נתמכת.

## Session Log

### 2026-08-05 — בניית שלב 4 [shipped]
- **What was done:** הותקן `openai@7`; `server-env` הורחב ב-`OPENAI_API_KEY`,
  `OPENAI_MODEL`, `SECRET_ENCRYPTION_KEY`, `APP_BASE_URL` + שני גייטים ו-שני
  דגלים ב-`/api/health`. נבנו `@/lib/crypto/secret-box` (AES-256-GCM),
  `@/lib/rate-limit`, `@/lib/telegram` (client + copy + types), `@/lib/ai`
  (api-caller, date-zone, tools, prompt, agent), שני services,
  שלושה endpoints, `use-telegram-integration` וכרטיס `TelegramIntegration`
  ב-[[settings-feature]]. `firestore.rules` ו-`eslint.config.mjs` הורחבו.
- **Decisions:** שלוש ההחלטות ב-Overview. בנוסף: ה-webhook עוקף את `withApiHandler`
  כי סטטוס כישלון גורם ל-Telegram לשלוח שוב; העיבוד רץ ב-`after()` כדי שתור ארוך
  לא יחזיק את החיבור; שלב `/start <code>` נפרד מהשמירה כי טוקן מוכיח בעלות על
  הבוט ולא על הצ׳אט; אזור זמן מפורש (`Asia/Jerusalem`) במקום `@/utils/date`,
  שנשען על אזור הזמן של המארח.
- **Notes / Caveats:** **שלושה באגים נתפסו באימות ותוקנו.** (1) `dateOnlyToIso`
  עם מעבר תיקון אחד נחת ביום הקודם ב-27.3 — ישראל מקדמת שעון ב-02:00 מקומי שזה
  בדיוק 00:00 UTC; נדרשים שני מעברים. (2) `shiftDateOnly` החליק יום סביב מעבר
  שעון כי חיסר 86,400,000ms מרגע; הוחלף באריתמטיקה קלנדרית. (3) התחברות מ-origin
  לא נגיש סובבה את `webhookSecret` והשאירה רישום ישן אצל Telegram — הבוט היה
  "מחובר ואילם"; `applyWebhook` מוחק את הרישום במקרה הזה.
  אומת: `typecheck` + `lint` נקיים; `/api/health` מחזיר ארבעה דגלים `true`;
  שני נתיבי ההגדרות מחזירים 401 עם המעטפת; ה-webhook מחזיר `{ok:false}` 401 גם
  ללא כותרת וגם עם סוד שגוי; 22 מקרי בדיקה של אזור הזמן עוברים כולל שני מעברי
  השעון של 2026; secret-box אומת על round-trip, IV טרי, זיהוי שינוי ושמירת גרסה.
  `SECRET_ENCRYPTION_KEY` נוצר ונוסף ל-`.env.local` — **סיבוב שלו מבטל כל טוקן
  שמור**.
- **Related:** [[telegram-integration]], [[ai-agent]], [[api-routes]], [[services-server]], [[config-env]], [[firebase-integration]], [[settings-feature]], [[project-overview]], [[firebase-env-setup]]

### 2026-08-05 — אימות מקצה-לקצה מול בוט אמיתי [shipped]
- **What was done:** המשתמש חיבר בוט אמיתי (`@ronen2905bot`) דרך מסך ההגדרות.
  האבחון מצא: הטוקן תקין (`getMe` OK), הפענוח מ-Firestore עובד, ארבעת הדגלים
  ב-`/api/health` הם `true` — אבל `getWebhookInfo.url` ריק ו-`chatId` לא מקושר,
  כלומר "מחובר ואילם". זה **התנהגות מתוכננת**: `APP_BASE_URL` לא מוגדר, ולכן
  `applyWebhook` מזהה origin לא נגיש ומוחק את הרישום.
  נבנה ריליי מקומי שמנצל בדיוק את המצב הזה: כשאין webhook רשום, העדכונים נשארים
  בתור אצל Telegram ו-`getUpdates` שואב אותם; הריליי שולח כל עדכון ל-route האמיתי
  עם ה-`webhookSecret` מ-Firestore. **כל השרשרת רצה:** `/start <code>` קישר את
  הצ׳אט וצרך את הקוד, שתי בקשות בעברית הפכו למשימות אחרי מקלדת אישור
  (`act:confirm`), ושתיהן נחתו עם `dueDate` = מחר בחצות **שעון ישראל** — כלומר
  אזור הזמן המפורש עובד. `agentSessions` שמר transcript של 4 הודעות ו-`pendingAction`
  התנקה. שישה עדכונים, כולם `200 {ok:true}`.
- **Decisions:** ריליי `getUpdates` במקום התקנת מנהרה. הוא מכסה את כל מה שיש
  לפרויקט שליטה עליו — אימות הסוד, ניתוב, ה-agent, ה-tools, ההרשאה, ההתמדה —
  ומשאיר בחוץ רק את הדליברי של Telegram עצמו. לא הותקן `cloudflared`/`ngrok`.
  הריליי חי ב-scratchpad ולא ב-repo: הוא כלי אבחון לסשן, לא חלק מהמוצר.
- **Notes / Caveats:** הריליי דורש ש**לא** יהיה webhook רשום — ברגע ש-`setWebhook`
  יצליח, `getUpdates` יחזיר 409 והכלי יפסיק לעבוד. שני ממצאים צדדיים נכנסו
  ל-Open Questions: `openai_api_key` באותיות קטנות (עובד רק ב-Windows), ומשימה
  ישנה עם `dueDate` בשנת 1906.
- **Related:** [[telegram-integration]], [[ai-agent]], [[config-env]], [[api-routes]], [[services-server]], [[tasks-feature]], [[firebase-env-setup]]

### 2026-08-06 — הבוט בפרודקשן: שלושה כשלים שנפרדו זה מזה [wip]
- **What was done:** הבוט לא הגיב בכלל. `getWebhookInfo` הראה `url: (none)` ו-5
  עדכונים תקועים — הרישום נמחק אתמול כי רק `localhost` היה זמין, ומאז אף אחד לא
  לחץ «בדיקת חיבור». נרשם Webhook לכתובת הפרודקשן; אומת ש-3 סוגי בקשה מזויפת
  מקבלים 401. אחר כך התגלו **שני באגים נפרדים**:
  (1) ה-agent חיקה את תצוגת האישור של עצמו במקום לקרוא לכלי — ראה [[ai-agent]].
  תוקן ונפרס; אומת שהמודל שוב קורא ל-`create_task`.
  (2) האישור עצמו נכשל: `createCustomToken` לא מצליח לחתום בפרודקשן. **זו רגרסיה
  שנוצרה באותו יום** מהמעבר ל-ADC — ראה [[firebase-integration]]. נוסף דגל
  `adminCanSignTokens` ל-`/api/health`, והוא הכריע: `true` מקומית, `false` בענן.
- **Decisions:** לא שונתה שום הרשאה ולא נוצר סוד לפני שהאבחון הוכח — הדגל נבנה
  קודם. הדגל נשאר בקוד לצמיתות: `firebaseAdminConfigured` הוא `true` בשני
  המקומות, ולכן בלעדיו אין שום דבר שמבדיל בין המצבים.
  שני מסלולי תיקון הוצגו למשתמש: מתן `roles/iam.serviceAccountTokenCreator`
  (מועדף — אין מפתח לנהל) או החזרת `FIREBASE_PRIVATE_KEY` דרך Secret Manager.
- **Notes / Caveats:** **הסשן נעצר לפני התיקון.** נכון לסיום: הרישום תקין, באג
  החיקוי סגור, ופעולות משנות עדיין נכשלות ברגע האישור. הצעד הבא הוא הרשאה אחת
  בקונסולה של Google Cloud (לא של Firebase — זו הייתה נקודת הבלבול האחרונה).
  לקח כללי: שלושת הכשלים נראו זהים מבחוץ ("הבוט לא עובד") ונדרשו שלושה אבחונים
  שונים לגמרי.
- **Related:** [[ai-agent]], [[telegram-integration]], [[firebase-integration]], [[firebase-env-setup]], [[config-env]], [[auth]]

### 2026-08-06 — הבוט עובד מקצה לקצה [shipped]
- **What was done:** ההרשאה `roles/iam.serviceAccountTokenCreator` ניתנה
  ל-`firebase-app-hosting-compute@a2zronen`, ו-`adminCanSignTokens` התהפך
  ל-`true` תוך פחות מדקה, בלי פריסה מחדש. מיד אחר כך נוצרו שתי משימות אמיתיות
  מהבוט (`לקנות חלב` 06:00:53Z, `לעשות קניות` 06:02:40Z), ו-`pendingAction` נשאר
  ריק — כלומר מחזור האישור נסגר במלואו. **שלב 4 מאומת בפרודקשן.**
  בנוסף: `ErrorState` הוצמד ל-`NODE_ENV` במקום ל-`env.isDevelopment`.
- **Decisions:** נבחרה ההרשאה ולא Secret Manager — אין מפתח ארוך-טווח לנהל,
  והיא נכנסת בלי פריסה. הדגל `adminCanSignTokens` הוכיח את עצמו: הוא זה שסימן
  את רגע הפתיחה, ולא ניחוש.
  ההצמדה של `ErrorState` ל-`NODE_ENV` היא שינוי מהותי ולא סגנוני:
  `NEXT_PUBLIC_APP_ENV` נופל ל-`"development"` כברירת מחדל, ולכן תקלת פריסה
  **נכשלת לכיוון הפתוח** ומדפיסה פנימיות למשתמשים. `NODE_ENV` נכתב ע"י ה-bundler
  ואינו דורש שרשרת אספקה.
- **Notes / Caveats:** האבחון שהוסף ל-`/api/health` הכריע גם את תעלומת הסביבה:
  `appBaseUrlSet: true` (משתני RUNTIME מ-`apphosting.yaml` כן מגיעים) לצד
  `appEnvAtRuntime: "development"` (ערך אמיתי, לא חסר) מוכיחים יחד שקיימים
  משתנים ברמת הקונסולה שגוברים על הקובץ. תומך בכך: `OPENAI_API_KEY` ו-
  `SECRET_ENCRYPTION_KEY` מדווחים כמוגדרים ואינם בקובץ כלל.
  המשתמש דיווח «אין תגובה מהבוט» בזמן שהמשימות כן נוצרו — התלונה הייתה על
  latency, לא על כשל. נרשם ב-Open Questions.
- **Related:** [[firebase-integration]], [[config-env]], [[ai-agent]], [[telegram-integration]], [[firebase-env-setup]], [[components-common]]
