# Firebase Env Setup

## Overview

חיבור הפרויקט ל-Firebase דורש שתי קבוצות משתנים ב-`.env.local`, ושתיהן נבדקות בנפרד:

| קבוצה | משתנים | נבדק ע"י | נצרך ב־ |
|---|---|---|---|
| לקוח | 6 × `NEXT_PUBLIC_FIREBASE_*` | `isFirebaseConfigured` ([[config-env]]) | Web SDK, `AuthGate` |
| שרת | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | `isFirebaseAdminConfigured` | Admin SDK, `requireUser` |

**`.env.example` הוא שמות המשתנים המחייבים.** `src/config/server-env.ts` קורא כל שם כגישה סטטית מילולית, ולכן שם שאינו תואם בדיוק פשוט נקרא כ-`undefined` — בלי שגיאה, בלי אזהרה על השם עצמו.

**`GET /api/health` הוא כלי האבחון.** הוא מחזיר את שני הדגלים בנפרד ומאפשר לזהות מיד איזו קבוצה חסרה, בלי לנחש ובלי לחשוף ערכים.

## Open Questions
- `FIREBASE_ADMIN_PRIVATE_KEY_ID` קיים ב-`.env.local` אך שום קוד לא קורא אותו — שריד מפורמט ה-service account המלא. לא מזיק, אפשר להסיר.
- מופיעה שגיאת קונסולה `Internal Next.js error: Router action dispatched before initialization` בניווט לנתיב מוגן; נראית קשורה להפניה של `AuthGate` בזמן אתחול, ולא טופלה.
- לא אומת מקצה-לקצה שהמנויים עובדים — האימות דורש משתמש מחובר, ולא ניתן היה לבצע התחברות בסשן הזה.
- אינדקסים ב-Firestore נבנים אסינכרונית; אם השגיאה חוזרת מיד אחרי פריסה, ייתכן שהבנייה טרם הסתיימה.

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
