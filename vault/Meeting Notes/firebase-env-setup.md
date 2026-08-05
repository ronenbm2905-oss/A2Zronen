# Firebase Env Setup

## Overview

חיבור הפרויקט ל-Firebase דורש שתי קבוצות משתנים, ושתיהן נבדקות בנפרד. **בפיתוח
הן מגיעות מ-`.env.local`; בפרודקשן (Firebase App Hosting) מ-`apphosting.yaml`** —
שני מקורות נפרדים שקל לתקן אחד מהם ולשכוח את השני:

| קבוצה | משתנים | נבדק ע"י | נצרך ב־ |
|---|---|---|---|
| לקוח | 6 × `NEXT_PUBLIC_FIREBASE_*` | `isFirebaseConfigured` ([[config-env]]) | Web SDK, `AuthGate` |
| שרת | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | `isFirebaseAdminConfigured` | Admin SDK, `requireUser` |

**`.env.example` הוא שמות המשתנים המחייבים.** `src/config/server-env.ts` קורא כל שם כגישה סטטית מילולית, ולכן שם שאינו תואם בדיוק פשוט נקרא כ-`undefined` — בלי שגיאה, בלי אזהרה על השם עצמו.

**`GET /api/health` הוא כלי האבחון.** הוא מחזיר את שני הדגלים בנפרד ומאפשר לזהות מיד איזו קבוצה חסרה, בלי לנחש ובלי לחשוף ערכים. הוא עובד גם על הדפלוימנט —
`https://a2zronen--a2zronen.europe-west4.hosted.app/api/health` הוא הדרך המהירה
ביותר לענות על "למה זה עובד אצלי ולא בענן".

### הכלל שמסביר את רוב התקלות

`NEXT_PUBLIC_*` נטבעים בבאנדל **בזמן build** ע"י החלפה טקסטואלית. לכן משתנה כזה
שמוגדר רק בזמן ריצה — בקונסולה, ב-Cloud Run — **לא יעבוד לעולם**: כשהקונטיינר
עולה, הבאנדל כבר בנוי. ב-App Hosting זה אומר `availability: [BUILD, RUNTIME]`
ב-`apphosting.yaml`. משתני שרת, לעומת זאת, נקראים בזמן ריצה ולכן `RUNTIME` מספיק.

## Open Questions
- `FIREBASE_ADMIN_PRIVATE_KEY_ID` קיים ב-`.env.local` אך שום קוד לא קורא אותו — שריד מפורמט ה-service account המלא. לא מזיק, אפשר להסיר.
- מופיעה שגיאת קונסולה `Internal Next.js error: Router action dispatched before initialization` בניווט לנתיב מוגן; נראית קשורה להפניה של `AuthGate` בזמן אתחול, ולא טופלה.
- לא אומת מקצה-לקצה שהמנויים עובדים — האימות דורש משתמש מחובר, ולא ניתן היה לבצע התחברות בסשן הזה.
- אינדקסים ב-Firestore נבנים אסינכרונית; אם השגיאה חוזרת מיד אחרי פריסה, ייתכן שהבנייה טרם הסתיימה.
- **`/api/health` מדווח `environment: development` בפרודקשן** למרות
  `NEXT_PUBLIC_APP_ENV=production` ב-`apphosting.yaml`. החשד: משתנה ריצה ישן ברמת
  ה-backend שדורס אותו. לבדוק בקונסולה של App Hosting ולהסיר.

## Session Log

### 2026-08-05 — אבחון "החיבור ל-Firebase אינו מוגדר" [shipped]
- **What was done:** אובחן ותוקן כשל תצורה. `GET /api/health` הראה `firebaseConfigured: true` אך `firebaseAdminConfigured: false`. הסיבה: שמות משתני השרת ב-`.env.local` לא תאמו את הקוד — `FIREBASE_ADMIN_CLIENT_EMAIL` ו-`FIREBASE_ADMIN_PRIVATE_KEY` במקום `FIREBASE_CLIENT_EMAIL` ו-`FIREBASE_PRIVATE_KEY`, ו-`FIREBASE_PROJECT_ID` נעדר לחלוטין. השמות שונו והמשתנה החסר נוסף מערך `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. בנוסף נוספה קונפיגורציית `a2z-attach` ל-`.claude/launch.json` לחיבור לשרת פיתוח שכבר רץ.
- **Decisions:** לא הורג תהליך `next dev` הקיים (PID 29972) — Next 16 מרשה שרת אחד לכל תיקייה, ולכן `autoPort` לא עוזר; חיבור לשרת הקיים עדיף על הפלת סשן פעיל. הערכים עצמם לא נגעו — רק שמות המפתחות — והאבחון בוצע דרך אורכי ערכים ו-`/api/health` בלבד, בלי להדפיס סודות.
- **Notes / Caveats:** Next dev זיהה את שינוי `.env.local` והפעיל את עצמו מחדש אוטומטית; לא נדרשה הפעלה ידנית. אומת: שני הדגלים `true`, ו-`/dashboard` מפנה ל-`/login` כצפוי במקום להציג `FirebaseNotConfigured`.
- **Related:** [[config-env]], [[firebase-integration]], [[auth]], [[api-routes]], [[vault-bootstrap]]

### 2026-08-05 — "Realtime subscription failed": פריסת אינדקסים וחוקים [shipped]
- **What was done:** `firestore:indexes` הראה `"indexes": []` — **אף אינדקס לא היה פרוס**, בעוד ששלושת המנויים ב-`services/client/subscriptions.ts` דורשים אינדקס מורכב כל אחד (`tasks: userId+updatedAt`, `projects/tags: userId+name`). `.firebaserc` קושר ל-`a2zronen`, ונפרסו כל 7 האינדקסים + `firestore.rules`. בנוסף תוקן `src/lib/logger.ts`: הוספה `serializeErrors` שמשטחת `Error` לאובייקט רגיל.
- **Decisions:** תיקון ה-logger בוצע **לפני** האבחון ולא אחריו. `Error` נושא את `message`/`stack`/`name` כתכונות לא-enumerable, ולכן ה-overlay של Next הציג `FirebaseError` כ-`{}` — בדיוק כשהקוד שלו היה הדבר היחיד ששווה לקרוא. השיטוח נעשה ב-logger ולא באתר הקריאה, כדי שכל `logger.error(msg, { err })` יהיה שימושי.
- **Notes / Caveats:** פריסת החוקים דורסת את מה שהיה חי ב-Firestore; אושרה מראש ע"י המשתמש. **לא אומת מקצה-לקצה** שהמנויים עובדים — נדרש משתמש מחובר. אינדקסים נבנים אסינכרונית.
- **Related:** [[services-client]], [[data-fetching-query]], [[firebase-integration]], [[errors-handling]], [[hooks]]

### 2026-08-05 — השגיאה חוזרת: הקוד הוזרם למחרוזת ההודעה [wip]
- **What was done:** אחרי פריסת האינדקסים השגיאה חזרה, ועדיין כ-`{}`. הסתבר ש-`serializeErrors` לא פותר את הבעיה: **ה-overlay של Next לא מסריאל ארגומנטים נוספים ל-console כלל** — הוא מציג כל אובייקט כ-`{}` ללא קשר לתוכנו. נוספה `describeError(error)` ל-`logger.ts`, והיא מוזרמת ל**מחרוזת ההודעה** בשני אתרי הלוג ב-`use-realtime-collection.ts`. בנוסף נכתב probe עם Admin SDK שמריץ את שלוש שאילתות ה-realtime: כל השלוש עברו — **האינדקסים מוכנים**.
- **Decisions:** הפרט נכנס למחרוזת ולא ל-`meta`, כי רק המחרוזת מוצגת מילולית ב-overlay. `serializeErrors` נשארה — היא עדיין נכונה עבור הקונסולה האמיתית ועבור transport עתידי.
- **Notes / Caveats:** **הסיבה לשגיאה עדיין לא ידועה.** האינדקסים החסרים היו באג אמיתי ותוקנו ואומתו, אך הם כנראה לא היו הסיבה היחידה — או שהשגיאה הנוכחית שונה. probe עם Admin SDK **עוקף חוקי אבטחה**, ולכן הוא מוכיח שהאינדקס קיים אך **לא** מוכיח שהחוקים מתירים את הקריאה מהדפדפן. החשוד הבא: `permission-denied`.
- **Related:** [[errors-handling]], [[services-client]], [[firebase-integration]], [[data-fetching-query]]

### 2026-08-05 — "החיבור ל-Firebase אינו מוגדר" בפרודקשן [shipped]
- **What was done:** אותה הודעה בדיוק כמו בסשן הראשון, אבל **סיבה אחרת לגמרי**.
  `/api/health` על הדפלוימנט הראה `firebaseConfigured:false` **וגם**
  `firebaseAdminConfigured:false`, בעוד ששניהם `true` מקומית — כלומר הבעיה לא
  ב-`.env.local` אלא בכך של-App Hosting אין ממנו שום דבר. **לא היה
  `apphosting.yaml` בריפו.** נוצר קובץ עם 7 משתני `NEXT_PUBLIC_FIREBASE_*` +
  `NEXT_PUBLIC_APP_ENV` ב-`[BUILD, RUNTIME]`, ו-`FIREBASE_PROJECT_ID` +
  `APP_BASE_URL` ב-`RUNTIME`. במקביל `admin.ts` קיבל נפילה חזרה ל-ADC.
  אחרי הדחיפה, rollout אוטומטי (ABIU מופעל) — כ-28 דקות — וארבעת הדגלים `true`.
  מסך ההתחברות נטען עם הטופס, בלי שגיאות קונסולה.
- **Decisions:** ADC במקום מפתח service account ב-Secret Manager. ב-App Hosting
  הקונטיינר כבר רץ כ-service account, ולכן הדרישה למפתח הייתה מחייבת לייצר מפתח
  להורדה ולאחסן אותו — כדי להחזיר לריצה אישור שכבר יש לה. שני הסודות
  (`OPENAI_API_KEY`, `SECRET_ENCRYPTION_KEY`) הושארו מחוץ ל-yaml כי הריפו ציבורי;
  הם שרדו את ה-rollout, מה שמאשר שהגדרות ברמת ה-backend אינן נמחקות ע"י הקובץ.
- **Notes / Caveats:** **`environment` עדיין מדווח `development`** למרות
  `NEXT_PUBLIC_APP_ENV=production` ב-yaml. הלקוח כנראה תקין — מסך ההתחברות נטען,
  מה שמוכיח שההזרקה ב-BUILD עבדה — ולכן החשד הוא משתנה ריצה ישן ברמת ה-backend
  שדורס את ערך ה-`RUNTIME`. **לא אומת.** ההשפעה מוגבלת ל-`env.appEnv`, שמפעיל את
  פירוט השגיאות ב-`ErrorState` (רכיב לקוח, ולכן קורא את הערך מה-build).
  התחברות בפועל לא נבדקה — היא דורשת סיסמה.
- **Related:** [[config-env]], [[firebase-integration]], [[stage-4-telegram-ai]], [[telegram-integration]], [[api-routes]]
