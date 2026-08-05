# Client Services

## Overview

`src/services/client` הוא נתיב ה-**קריאה** של המערכת: מנויי `onSnapshot` ישירות מהדפדפן ל-Firestore, דרך ה-Web SDK. אין כאן כתיבות — `firestore.rules` חוסם אותן ברמת בסיס הנתונים ([[firebase-integration]]).

כל שאילתה כאן **חייבת** לשאת `where("userId", "==", uid)`. זו לא זהירות: Firestore דוחה כל שאילתה שאינו יכול להוכיח שהיא בטוחה מול החוקים, כך שהשמטת התנאי תגרום לשגיאת הרשאה ולא לדליפת נתונים.

### למה `refs.ts` משוכפל

`services/client/refs.ts` משקף שדה-אחר-שדה את `services/server/refs.ts` וחולק איתו את אותם converters, כדי שמשימה שהגיעה במנוי realtime תהיה **זהה** לאחת שחזרה מה-API. כל דבר אחר היה הופך את ההשוואה בעדכונים אופטימיים ב-[[hooks]] לבלתי אמינה.

השכפול מכוון: לשני ה-SDK-ים יש טיפוסי snapshot לא תואמים, ומיפוי גנרי יחיד היה דורש `any` בתפר.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/services/client/refs.ts` | `toTask`, `toProject`, `toTag` — מיפוי `QueryDocumentSnapshot` של ה-Web SDK ל-DTO, דרך ה-converters המשותפים ב-[[firebase-integration]] | מיפוי — משקף את `services/server/refs.ts` |
| `src/services/client/subscriptions.ts` | `subscribeTasks`, `subscribeProjects`, `subscribeTags` + הטיפוס `SubscriptionHandlers<T>`. פותחות `onSnapshot` מסונן לפי `userId` ומוגבל ב-`LIMITS`, ומחזירות `Unsubscribe` | מנויים — נצרך ע"י `useRealtimeCollection` ב-[[data-fetching-query]] |
| `src/services/client/index.ts` | barrel | גבול מודול |
| `src/services/index.ts` | ה-barrel הראשי — מייצא מחדש **רק** את `./client`, במכוון. ראה [[services-server]] | גבול מודול |

### `SubscriptionHandlers<T>`

חוזה של שלושה callbacks (`onData`, `onError`, ואופציונלית `onFirst`) שדרכו `useRealtimeCollection` ממיר דחיפה למשיכה. פירוט הגשר: [[data-fetching-query]].

## Open Questions
- המנויים מוגבלים ב-`LIMITS` — לא נבדק מה קורה כשמשתמש חורג מהתקרה; ייתכן שפריטים ישנים פשוט נעלמים מה-UI בלי אינדיקציה.
- אין דה-דופליקציה של מנויים בין קומפוננטות; ההסתמכות היא על מטמון React Query שיחזיק מנוי אחד למפתח.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד נתיב הקריאה בזמן אמת, הסיבה לשכפול `refs.ts`, והקשר בין `owns()` בחוקים לבין תנאי ה-`where` בכל שאילתה.
- **Decisions:** תועד בנפרד מ-[[data-fetching-query]] — כאן חיים המנויים עצמם, שם חי הגשר ל-React Query.
- **Notes / Caveats:** השכפול מול `services/server/refs.ts` חייב להישמר סינכרוני; שינוי שדה בצד אחד בלבד ישבור את ההשוואה בעדכונים אופטימיים בלי שגיאת קומפילציה.
- **Related:** [[services-server]], [[firebase-integration]], [[data-fetching-query]], [[hooks]], [[constants]]
