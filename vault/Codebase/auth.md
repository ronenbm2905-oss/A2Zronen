# Authentication

## Overview

אימות חוצה את כל השכבות, ולכן הוא מתועד כמודול אחד: שרת (`requireUser`), ספק לקוח (`AuthProvider`), שערים (gates) וטפסים.

### הכלל המרכזי

`requireUser()` הוא **השורה הראשונה בכל handler מוגן**, וה-`uid` שהוא מחזיר הוא **מקור הבעלות היחיד הקביל במערכת**. Services מקבלים אותו כארגומנט ולעולם לא קוראים `userId` מגוף בקשה — וזה מה שהופך את בידוד הדיירים לתכונה של מסלול הקוד ולא של ולידציה קפדנית של payload.

פרט טעון במיוחד ב-`require-user.ts`: `getAdminAuth()` זורק `CONFIG_ERROR` כשה-service account חסר. בלי ה-re-throw המפורש של `isAppError(error)`, בעיית התקנה הייתה מדווחת ללקוח כ-401 ושולחת את מי שמנפה שגיאות לשכבה הלא נכונה לגמרי.

### זרימת ההתחברות

```
טופס → Firebase Web SDK (signIn/createUser)
     → onAuthStateChanged ב-AuthProvider
     → POST /api/v1/auth/bootstrap  (יוצר users/{uid} בפעם הראשונה)
     → AuthStatus הופך ל-authenticated
     → AuthGate מרשה גישה / GuestGate מפנה החוצה
```

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/lib/auth/require-user.ts` | מאמת `Authorization: Bearer <idToken>` דרך Admin SDK ומחזיר `AuthUser`. `checkRevoked: false` חוסך round-trip; זורק `UNAUTHORIZED` על טוקן חסר/פגום ומעביר הלאה `CONFIG_ERROR` | שרת — [[api-routes]] |
| `src/lib/auth/index.ts` | barrel | גבול מודול |
| `src/components/providers/auth-provider.tsx` | ליבת הלקוח. מחזיק `AuthContext`, מנוי `onAuthStateChanged`, מצב `AuthStatus`, פעולות (login/register/logout/reset/changePassword), קריאת bootstrap, וניקוי מטמון React Query בהחלפת משתמש | לקוח — [[layout-shell]] |
| `src/hooks/use-auth.ts` | `useAuth()` — גישה מוקלדת ל-context עם שגיאה ברורה מחוץ ל-Provider. `useApiFetch()` — עוטף את `apiFetch` עם `getToken` של המשתמש הנוכחי | גשר — [[hooks]], [[api-client]] |
| `src/components/auth/auth-gate.tsx` | חוסם את `(app)` עד לאימות; מפנה ל-login עם `redirect`, ומציג `FirebaseNotConfigured` כשאין תצורה | שער — [[app-routing]] |
| `src/components/auth/guest-gate.tsx` | ההפך: מפנה משתמש מחובר מחוץ ל-`(auth)`, תוך כיבוד פרמטר `redirect` | שער — [[app-routing]] |
| `src/components/auth/auth-card.tsx` | מעטפת ויזואלית משותפת למסכי ההזדהות (לוגו, כותרת, קישור תחתון) | UI |
| `src/components/auth/login-form.tsx` | טופס התחברות מעל `useZodForm` + `loginSchema`; מתרגם שגיאות דרך `toHebrewAuthMessage` | UI |
| `src/components/auth/register-form.tsx` | טופס הרשמה, כולל `LIMITS` לאורכי שדות | UI |
| `src/components/auth/forgot-password-form.tsx` | שליחת מייל איפוס, עם מצב הצלחה נפרד | UI |
| `src/components/auth/index.ts` | barrel | גבול מודול |
| `src/app/(auth)/layout.tsx` | עוטף ב-`GuestGate` בתוך `Suspense` (נדרש בגלל `useSearchParams`) | ניתוב |
| `src/app/(auth)/login/page.tsx` | דף ההתחברות | ניתוב |
| `src/app/(auth)/register/page.tsx` | דף ההרשמה | ניתוב |
| `src/app/(auth)/forgot-password/page.tsx` | דף שכחתי סיסמה | ניתוב |
| `src/app/api/v1/auth/bootstrap/route.ts` | `POST` — יוצר את מסמך המראה `users/{uid}` | שרת — [[api-routes]] |

### "לא הגיע מייל איפוס" — קודם לשלול כתובת שגויה

`ForgotPasswordForm` בולע `auth/user-not-found` ומציג את מסך ההצלחה בכל מקרה, כדי
לא לספק אורקל למניית חשבונות. התוצאה: **כתובת שגויה נראית בדיוק כמו הצלחה**, ואף
מייל לא נשלח. לכן הבדיקה הראשונה היא תמיד "איזה חשבונות בכלל קיימים", דרך
`listUsers` ב-Admin SDK — ולא "למה SMTP לא עובד".

כשצריך לעקוף את הדוא״ל לגמרי: `getAuth().generatePasswordResetLink(email)` מייצר
את אותו קישור בדיוק (`a2zronen.firebaseapp.com/__/auth/action?mode=resetPassword`),
חד-פעמי ולשעה. המשתמש עדיין בוחר את הסיסמה בעצמו בדף של Firebase.

## Open Questions
- `checkRevoked: false` — התנתקות לא מבטלת טוקנים קיימים מיידית. יש להפוך ל-`true` אם ביטול מיידי יהפוך לדרישה.
- החשבון היחיד בפרויקט הוא `ronenbm@promall.co.il` — דומיין ארגוני. מיילים מ-`noreply@a2zronen.firebaseapp.com` עלולים ליפול שם ב-SPF/DMARC; לא נבדק.
- אין אימות אימייל בפועל: `AuthUser.emailVerified` נקרא מהטוקן אך שום שער או endpoint לא בודק אותו.
- אין ספקי OAuth (Google וכו') — רק אימייל/סיסמה.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד שכבת האימות מקצה לקצה — 16 קבצים משרת עד טופס, זרימת ההתחברות, והכלל שה-`uid` מגיע רק מטוקן מאומת.
- **Decisions:** אוחד למודול אחד למרות שהקבצים מפוזרים בארבע תיקיות — אימות הוא חתך אנכי, ופיצול לפי תיקייה היה מסתיר את הזרימה.
- **Notes / Caveats:** ה-re-throw של `CONFIG_ERROR` ב-`require-user.ts` נראה כמו קוד מיותר אבל הוא נושא משקל — אל תסירו אותו.
- **Related:** [[api-routes]], [[services-server]], [[firebase-integration]], [[layout-shell]], [[settings-feature]], [[app-routing]]

### 2026-08-06 — "לא מגיע מייל איפוס" [debug]
- **What was done:** אבחון בלי שינוי קוד. `listUsers` הראה **חשבון אחד בלבד**:
  `ronenbm@promall.co.il` (uid `hdUrZh…`, ספק `password`, נוצר 05-08 17:53) — אותו
  uid שמחזיק את חיבור ה-Telegram. החשד המרכזי: הוקלדה כתובת אחרת, וה-form הציג
  מסך הצלחה בלי לשלוח דבר. הופק קישור איפוס ב-`generatePasswordResetLink`
  ונמסר כקובץ.
- **Decisions:** קישור במקום שינוי סיסמה מהצד שלי. `updateUser({password})` היה
  פותר את התסמין אבל מחייב אותי להמציא ולהעביר סיסמה; הקישור משאיר את הבחירה
  אצל המשתמש בדף של Firebase. הקישור נמסר כקובץ ולא הודפס בצ׳אט.
- **Notes / Caveats:** הבליעה של `auth/user-not-found` היא החלטת אבטחה נכונה, אבל
  היא **הסיבה שהתקלה הזו מבלבלת** — אין שום הבדל ויזואלי בין כתובת שגויה להצלחה.
  לא אומת אם המייל המקורי נשלח ונחסם, או שמעולם לא נשלח.
- **Related:** [[firebase-integration]], [[firebase-env-setup]], [[errors-handling]]
