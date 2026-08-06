# Config & Environment

## Overview

`src/config` הוא **המקום היחיד** בקוד שקורא `process.env`. שלושה קבצים, כל אחד עם גבול ברור: קבועים סטטיים, סביבת לקוח, סביבת שרת.

שני כללים שהמודול קיים כדי לאכוף:

1. **כל קריאה ל-`process.env` היא גישה סטטית ומילולית.** Next.js מזריק משתני `NEXT_PUBLIC_*` בזמן build על ידי החלפה טקסטואלית — כך שגישה דינמית (`process.env[key]`) תיפתר בשקט ל-`undefined` ב-bundle של הדפדפן. לכן `env.ts` מונה את כל שבעת המשתנים במפורש.
2. **הפרסינג לעולם לא זורק בזמן import.** `.env.local` לא מוגדר לא אמור למנוע מהאפליקציה לעלות. במקום זה נחשפים גייטים בוליאניים (`isFirebaseConfigured`, `isFirebaseAdminConfigured`) שהצרכנים בודקים, והכשל מתרחש בקול רם רק בנקודת השימוש.

הגייטים האלה הם מה שמאפשר לאפליקציה לרוץ ולהציג את [[components-common]]`FirebaseNotConfigured` במקום להתרסק כשה-Firebase לא מחובר.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/config/app.ts` | קבועים שלא תלויים בסביבה: `name`, `version`, `apiBasePath` (`/api`), `apiVersion` (`v1`), `requestIdHeader` (`x-request-id`). מיוצא כ-`appConfig` | תשתית — נצרך ע"י [[api-layer]], [[api-client]], [[build-tooling]] (proxy) |
| `src/config/env.ts` | סכמת Zod ל-7 משתני `NEXT_PUBLIC_FIREBASE_*` + `NEXT_PUBLIC_APP_ENV`. מייצא `env`, `isFirebaseConfigured`, טיפוסי `Env` / `AppEnv`. ריק/רווחים נחשב "לא מוגדר" | לקוח **ושרת** — נצרך ע"י [[firebase-integration]], טפסי [[auth]], [[components-common]] |
| `src/config/server-env.ts` | סכמת Zod לכל סוד שהשרת מחזיק: service account (`FIREBASE_*`), `OPENAI_API_KEY` + `OPENAI_MODEL`, `SECRET_ENCRYPTION_KEY`, `APP_BASE_URL`. מייצא `serverEnv` ושלושה גייטים: `isFirebaseAdminConfigured`, `isOpenAiConfigured`, `isSecretEncryptionConfigured` | שרת בלבד — נצרך ע"י `lib/firebase/admin.ts` ב-[[firebase-integration]], [[ai-agent]], [[telegram-integration]] ובדיקת הבריאות ב-[[api-routes]] |
| `.env.example` | תבנית של כל המשתנים הנדרשים (לא ב-`src`, מתועד כאן כי הוא החוזה של המודול) | תיעוד |
| `apphosting.yaml` | **התצורה בפרודקשן.** 7 משתני `NEXT_PUBLIC_*` ב-`availability: [BUILD, RUNTIME]`, `NEXT_PUBLIC_APP_ENV=production`, `FIREBASE_PROJECT_ID` ו-`APP_BASE_URL` ב-`RUNTIME`, ו-`runConfig` | פריסה — Firebase App Hosting |

### שני מקורות תצורה, לא אחד

`.env.example` הוא החוזה, אבל **הוא לא ממלא את עצמו בשום סביבה**. בפיתוח הערכים
באים מ-`.env.local`; ב-App Hosting מ-`apphosting.yaml`. משתנה שנוסף לקוד צריך
להיכנס לשני המקומות — אחרת הוא עובד מקומית ושותק בענן.

הכלל שקובע היכן: `NEXT_PUBLIC_*` נטבעים ב-bundle **בזמן build**, ולכן חייבים
`BUILD` ב-`availability`. הגדרה שלהם בזמן ריצה בלבד (קונסולה, Cloud Run) לא
תעבוד לעולם — הבאנדל כבר נבנה. משתני שרת נקראים בזמן ריצה, ולכן `RUNTIME` מספיק.

### מה **לא** נמצא כאן

ה-Telegram Bot Token אינו משתנה סביבה. הוא נתון פר-משתמש, מגיע ממסך ההגדרות
ונשמר מוצפן ב-Firestore — ולכן החלפת בוט אינה נוגעת בקובץ הזה ואינה דורשת פריסה
מחדש. ראה [[telegram-integration]].

`SECRET_ENCRYPTION_KEY` הוא המפתח שמצפין את אותם טוקנים. **סיבוב שלו מבטל כל טוקן
שמור** — `openSecret` נכשל, וכל המשתמשים יצטרכו לחבר את הבוט מחדש.

## Open Questions
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` נקרא ומאומת אך אף מודול לא צורך אותו — Analytics לא מאותחל בשום מקום.
- **`env.appEnv` כבר לא שולט בשום התנהגות.** הצרכן היחיד שלו היה `ErrorState`, שעבר ב-2026-08-06 ל-`NODE_ENV` — כי `NEXT_PUBLIC_APP_ENV` נופל ל-`"development"` כברירת מחדל, ולכן תקלת אספקה **נכשלת לכיוון הפתוח** ומדפיסה פנימיות למשתמשים. מכאן ואילך הוא נתון דיווח ב-`/api/health` בלבד; אם משהו עתידי ירצה להסתמך עליו, לשקול קודם `NODE_ENV`.
- **משתני סביבה ברמת ה-backend גוברים על `apphosting.yaml`.** אומת ב-2026-08-06: `appBaseUrlSet: true` (משתנה RUNTIME מהקובץ מגיע) לצד `appEnvAtRuntime: "development"` (ערך אמיתי, לא חסר) בזמן שהקובץ מצהיר `production`. כלומר הקובץ אינו מקור יחיד לאמת, ויש להסיר את הדריסות בקונסולה.
- `APP_BASE_URL` אופציונלי; ללא מנהרה ציבורית Telegram פשוט לא ימסור עדכונים בסביבה מקומית. בפרודקשן הוא מוגדר ב-`apphosting.yaml`.
- `OPENAI_API_KEY` ו-`SECRET_ENCRYPTION_KEY` **לא** מוצהרים ב-`apphosting.yaml` — הם סודות אמיתיים והריפו ציבורי. הם מוגדרים כרגע ברמת ה-backend; אם rollout יפיל אותם, המקום הנכון הוא Secret Manager עם `secret:` ולא `value:`.
- ב-`.env.local` המקומי `OPENAI_API_KEY` כתוב באותיות קטנות. עובד רק כי `process.env` ב-Windows אינו רגיש לרישיות.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** מיפוי שלושת קבצי התצורה, הגבול לקוח/שרת, ושני הכללים שהמודול אוכף.
- **Decisions:** תועד כמודול נפרד ולא כחלק מ-[[build-tooling]], כי הגייטים שלו הם תלות התנהגותית של [[auth]] ו-[[firebase-integration]] — לא עניין של כלי בנייה.
- **Notes / Caveats:** `server-env.ts` הוא קובץ חדש שלא נכנס ל-commit הראשוני.
- **Related:** [[firebase-integration]], [[api-layer]], [[project-overview]]

### 2026-08-05 — הרחבה לסודות שלב 4 [shipped]
- **What was done:** `server-env.ts` קיבל `OPENAI_API_KEY`, `OPENAI_MODEL` (ברירת מחדל `gpt-4o-mini`), `SECRET_ENCRYPTION_KEY` ו-`APP_BASE_URL`, ושני גייטים חדשים. `/api/health` מדווח עליהם.
- **Decisions:** הבוט טוקן **לא** נכנס לכאן — הוא נתון פר-משתמש, ולא היה מאפשר "החלפת בוט בלי שינוי קוד". `APP_BASE_URL` עובר `z.url()` ומנוקה מ-slash סופי, כי הוא משורשר לנתיב ה-webhook.
- **Notes / Caveats:** `SECRET_ENCRYPTION_KEY` נוצר ונוסף ל-`.env.local` בסשן הזה; `OPENAI_API_KEY` כבר היה קיים בסביבה. אומת ב-`/api/health`: ארבעת הדגלים `true`.
- **Related:** [[telegram-integration]], [[ai-agent]], [[api-routes]]

### 2026-08-05 — `apphosting.yaml`: מקור התצורה השני [shipped]
- **What was done:** נוצר `apphosting.yaml` בשורש. שבעת משתני `NEXT_PUBLIC_FIREBASE_*`
  ו-`NEXT_PUBLIC_APP_ENV=production` הוצהרו עם `availability: [BUILD, RUNTIME]`;
  `FIREBASE_PROJECT_ID` ו-`APP_BASE_URL` עם `RUNTIME` בלבד. נוסף `runConfig`
  (0–2 instances, 1 CPU, 512MiB). הקובץ נוצר מתוך `.env.local` ע"י סקריפט ולא
  הועתק ביד, כדי שתו שהוחלף לא ייכנס בשקט.
- **Decisions:** הערכים הציבוריים נכתבו כ-`value:` גלוי, למרות שהריפו ציבורי —
  הם נשלחים ממילא בכל באנדל לכל מבקר, והשליטה עליהם היא `firestore.rules`
  ו-Firebase Auth ולא הסתרתם. `OPENAI_API_KEY` ו-`SECRET_ENCRYPTION_KEY`
  **הושארו מחוץ לקובץ**: הם סודות אמיתיים, כרגע מוגדרים ברמת ה-backend, ו-`value:`
  היה מפרסם אותם ב-GitHub. `APP_BASE_URL` הוגדר במפורש ולא הושאר לנפילה חזרה
  ל-origin של הבקשה, שעובר דרך ה-proxy של Google לפני שהוא מגיע אלינו.
- **Notes / Caveats:** הקובץ הזה הוא הסיבה שהמסך `FirebaseNotConfigured` הופיע
  בפרודקשן — בהיעדרו הבנייה ב-Cloud Build לא רואה שום `NEXT_PUBLIC_*`.
  **לא ידוע בוודאות** אם rollout שנשען על הקובץ ישמר את שני משתני הסוד שכבר
  מוגדרים ברמת ה-backend; זו הסיבה שהאימות שאחרי הפריסה בודק את ארבעת הדגלים
  ולא רק את שניים.
- **Related:** [[firebase-env-setup]], [[firebase-integration]], [[telegram-integration]], [[api-routes]]

### 2026-08-06 — אבחון האספקה בפרודקשן [shipped]
- **What was done:** נוספו ל-`/api/health` שני שדות אבחון: `appEnvAtRuntime`
  (נקרא דרך מפתח שנבנה בזמן ריצה, כדי שה-bundler לא יחליף אותו בערך מהבנייה)
  ו-`appBaseUrlSet`. הזוג הזה מפריד בין "המשתנה לא נכנס ל-bundle" לבין "המשתנה
  לא נכנס לקונטיינר", ומכאן נמצא ש-`apphosting.yaml` **כן** נאכף אבל נדרס.
- **Decisions:** להעביר את `ErrorState` ל-`NODE_ENV` במקום לתקן את אספקת
  `NEXT_PUBLIC_APP_ENV`. תיקון האספקה מחזיר את המצב לתקין; המעבר ל-`NODE_ENV`
  מוציא את ההחלטה מהשרשרת השבירה לגמרי, כי `NODE_ENV` נכתב ע"י ה-bundler ואינו
  ניתן לשכיחה בהגדרות.
- **Notes / Caveats:** השדות מסומנים בקוד כזמניים — למחוק כשהדריסות בקונסולה
  ינוקו. אף אחד מהם אינו סוד.
- **Related:** [[firebase-env-setup]], [[firebase-integration]], [[stage-4-telegram-ai]], [[components-common]]
