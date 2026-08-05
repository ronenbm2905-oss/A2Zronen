# Firebase Integration

## Overview

שני SDK-ים נפרדים לחלוטין, עם גבול מפורש ביניהם:

- **Web SDK** (`firebase`) — רץ בדפדפן. אחראי על Auth (התחברות, הרשמה, שינוי סיסמה) ועל **קריאות בלבד** מ-Firestore דרך `onSnapshot`.
- **Admin SDK** (`firebase-admin`) — רץ בשרת בלבד. עוקף את חוקי האבטחה לגמרי, ולכן **כל הכתיבות** במערכת עוברות דרכו.

`src/lib/firebase/index.ts` הוא barrel שמייצא **רק** את צד הלקוח. `./admin` לא מיוצא ממנו במכוון — הוא נושא את ה-service account ומסומן `server-only`, כך שקוד שרת חייב לייבא אותו בנתיב המלא והגבול נשאר גלוי בכל אתר קריאה.

### חוקי Firestore הם ההצהרה החזקה כאן

`firestore.rules` שולט בדבר אחד בדיוק: נתיב הקריאה הישיר של הדפדפן. `allow write: if false` הופך את "ה-UI אף פעם לא כותב ישירות" מקונבנציה שהקוד אמור לכבד ל-**אינוריאנט שבסיס הנתונים אוכף**. קריאות מוגבלות לבעלים, ומכיוון ש-Firestore דוחה כל שאילתה שלא ניתן להוכיח כבטוחה, הכלל `owns()` גם **מכריח** כל שאילתת לקוח לשאת `where("userId", "==", uid)` — ראה [[services-client]].

### הבעיה שה-converters פותרים

`Timestamp` הוא מחלקה שונה ב-`firebase-admin/firestore` וב-`firebase/firestore`. אילו היה דולף לטיפוסי הדומיין, ל-`Task` היו שתי צורות בלתי-תואמות. לכן כל חותמות הזמן ממופות ל-`ISODateString` בשני נתיבי הקריאה, דרך אותו סט converters.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/lib/firebase/client.ts` | `readFirebaseConfig()` בונה `FirebaseOptions` מ-[[config-env]] או מחזיר `null`; `getFirebaseApp()`, `getFirebaseAuth()`, `getFirestoreDb()` מאתחלים בעצלתיים וזורקים `AppError` כשאין תצורה | לקוח — נצרך ע"י [[auth]] ו-[[services-client]] |
| `src/lib/firebase/admin.ts` | אתחול Admin SDK **בשני מסלולים**: מפתח service account מפורש (`cert`) אם קיים, אחרת Application Default Credentials. מייצא `getAdminApp()`, `getAdminAuth()`, `getAdminDb()` ומעביר הלאה את `isFirebaseAdminConfigured` | **שרת בלבד** — נצרך ע"י [[auth]] (`requireUser`) ו-[[services-server]] |
| `src/lib/firebase/converters.ts` | `tsToIso`, `tsToIsoRequired`, `readString`, `readStringArray`, `readNullableString`, `readNullableNumber`, `readEnum` — קריאה מגננתית של שדות מסמך. **משותף לשני ה-SDK-ים** | חוצה גבול — נצרך ע"י `services/server/refs.ts` ו-`services/client/refs.ts` |
| `src/lib/firebase/index.ts` | barrel של צד הלקוח בלבד. מייצא את `client.ts` ואת `converters.ts`, ובמכוון **לא** את `admin.ts` | גבול מודול |
| `firestore.rules` | בידוד רב-דיירי בשכבת ה-DB: `allow write: if false` בכל קולקציה, קריאה מוגבלת לבעלים דרך `owns(resource.data)`, `users/{uid}` לפי מזהה מסמך, `integrations` ו-`agentSessions` **דחויות לחלוטין**, ו-default deny לכל השאר | אבטחה — החוזה של [[services-client]] |
| `firestore.indexes.json` | הגדרות אינדקסים מורכבים לשאילתות שמשלבות `userId` עם מיון/סינון | ביצועים |
| `firebase.json` | מצביע על `firestore.rules` ועל `firestore.indexes.json` עבור ה-CLI | פריסה |
| `.firebaserc` | מיפוי פרויקטים. מקושר ל-`a2zronen` | פריסה |

### שתי קולקציות שדחויות גם לבעלים

`integrations/{uid}` ו-`agentSessions/{sessionId}` הן היחידות עם `allow read, write: if false`
**גם למי שהן שייכות לו**. `integrations` מחזיקה טוקן בוט מוצפן ואת סוד ה-Webhook;
`agentSessions` מחזיקה את תמליל השיחה. לדפדפן אין סיבה לקרוא אותן, ודחיית הקריאה
היא מה שהופך את `TelegramIntegrationStatus` ל**נתיב היחיד** שדרכו מידע כזה יוצא —
ראה [[telegram-integration]].

## Open Questions
- **האינדקסים חייבים להיפרס לפני שמנוי realtime יעבוד.** שלוש השאילתות ב-[[services-client]] דורשות אינדקס מורכב; בלעדיו `onSnapshot` נכשל ב-`failed-precondition`. נפרסו ב-2026-08-05 — ראה [[firebase-env-setup]]. כל שאילתה חדשה עם `where` + `orderBy` תדרוש אינדקס נוסף ופריסה מחדש.
- `verifyIdToken` נקרא עם `checkRevoked: false` ב-[[auth]]; ביטול טוקן מיידי בעת התנתקות לא נתמך כרגע.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד הפרדת שני ה-SDK-ים, תפקיד `firestore.rules` כאינוריאנט ולא כקונבנציה, והסיבה לקיום ה-converters.
- **Decisions:** קבצי התצורה של Firebase (`firebase.json`, `.firebaserc`, `firestore.*`) תועדו כאן ולא ב-[[build-tooling]] — הם חלק מחוזה האבטחה, לא מצינור הבנייה.
- **Notes / Caveats:** `allow write: if false` תקף רק לנתיב הלקוח; ה-Admin SDK עוקף אותו לגמרי, ולכן **כל** אכיפת הבעלות בכתיבה חיה בקוד של [[services-server]].
- **Related:** [[services-server]], [[services-client]], [[config-env]], [[auth]], [[types-domain]]

### 2026-08-05 — קולקציות שלב 4 בחוקים [shipped]
- **What was done:** `firestore.rules` קיבל `integrations/{uid}` ו-`agentSessions/{sessionId}` עם `allow read, write: if false`. `converters.ts` קיבל `readNullableNumber` (מזהה צ׳אט של Telegram).
- **Decisions:** דחייה גם לבעלים ולא רק כתיבה — הדפדפן לא צריך את המסמכים האלה, ודחיית הקריאה היא מה שהופך את פרויקציית הסטטוס לנתיב היחיד. `readNullableNumber` פוסל `NaN` במפורש: הוא `number` עבור `typeof`, שורד JSON כ-`null`, והיה מגיע ל-`sendMessage` כמזהה צ׳אט.
- **Notes / Caveats:** **החוקים לא נפרסו בסשן הזה.** זה אינו חוסם: ה-default deny הקיים (`match /{document=**}`) כבר חוסם את שתי הקולקציות, וה-Admin SDK עוקף חוקים ממילא. הבלוקים המפורשים הופכים את הדחייה למכוונת ולא מקרית, ושווה לפרוס אותם בהזדמנות הבאה.
- **Related:** [[telegram-integration]], [[ai-agent]], [[services-server]], [[firebase-env-setup]]

### 2026-08-05 — Admin SDK בשני מסלולי אימות [shipped]
- **What was done:** `admin.ts` כבר לא דורש `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.
  מפתח service account מפורש עדיין מנצח כשהוא קיים; בהיעדרו נעשה שימוש ב-
  `applicationDefault()`. `server-env.ts` פוצל בהתאם ל-`hasAdminServiceAccountKey`
  ו-`hasApplicationDefaultCredentials`, ו-`isFirebaseAdminConfigured` הוא כעת
  ה-OR של השניים. הזיהוי נשען על `K_SERVICE`, `FIREBASE_CONFIG` או
  `GOOGLE_APPLICATION_CREDENTIALS` — כולם נכתבים ע"י הפלטפורמה, אף אחד לא על ידינו.
- **Decisions:** המפתח המפורש קודם בכוונה — מפתח ב-`.env.local` שמצביע על פרויקט
  אחר חייב לנצח, גם כשהמפתח מחובר ל-gcloud כמשהו אחר. הדרך החלופית הייתה ליצור
  מפתח service account להורדה ולאחסן אותו ב-Secret Manager, כלומר להחזיר לריצה
  אישור שכבר יש לה.
- **Notes / Caveats:** זיהוי שגוי של ADC עולה `CONFIG_ERROR` בקריאת ה-admin הראשונה —
  אותו כשל בדיוק שהמסלול של "אין מפתח" מייצר, ולכן אין כאן החמרה.
- **Related:** [[config-env]], [[firebase-env-setup]], [[auth]], [[services-server]]
