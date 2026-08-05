# Settings Feature

## Overview

מסך ההגדרות מנהל את חשבון המשתמש — פרופיל, סיסמה, התנתקות — ומאז שלב 4 גם את
**החיבור ל-Telegram**. הוא הפיצ'ר היחיד שנוגע ב-**שני מקורות אמת** — Firebase Auth
ומסמך המראה `users/{uid}`.

### הכלל שמונע סחיפה

Firebase Auth נשאר מקור האמת ל-`displayName` ול-`email`. מסמך `users/{uid}` קיים כדי שנתוני הפרופיל יהיו ניתנים לשאילתה לצד שאר נתוני הדייר. **רק `PATCH /api/v1/me` כותב אותו, ואותו handler מעדכן גם את Auth באותה קריאה** — כך שהשניים לא יכולים להיפרד.

שינוי סיסמה, לעומת זאת, **לא עובר דרך ה-API בכלל**: הוא נעשה ישירות מול Firebase Web SDK ב-`AuthProvider`, כי הוא דורש re-authentication עם הסיסמה הנוכחית — משהו שרק ה-SDK בצד הלקוח יכול לעשות.

## Files

| קובץ | מה הוא עושה | שכבה |
|---|---|---|
| `src/types/user.ts` | `UserProfile` (מסמך המראה), `AuthUser` (זהות מטוקן) | [[types-domain]] |
| `src/lib/schemas/auth.schema.ts` | `updateProfileSchema`, `changePasswordSchema` | [[schemas-validation]] |
| `src/app/api/v1/me/route.ts` | `GET` (קריאת פרופיל), `PATCH` (עדכון Auth + מסמך יחד) | [[api-routes]] |
| `src/services/server/user.service.ts` | `getProfile`, `updateProfile`, `bootstrapUser` | [[services-server]] |
| `src/hooks/use-profile-mutations.ts` | `useUpdateProfile` (דרך ה-API), `useChangePassword` (דרך `AuthProvider`) | [[hooks]] |
| `src/app/(app)/settings/page.tsx` | הנתיב | [[app-routing]] |
| `src/components/settings/settings-view.tsx` | מרכיב את שלושת החלקים תחת `PageHeader` | UI |
| `src/components/settings/profile-form.tsx` | עריכת שם תצוגה ואימייל | UI |
| `src/components/settings/change-password-form.tsx` | שינוי סיסמה (סיסמה נוכחית + חדשה + אישור) | UI |
| `src/components/settings/account-actions.tsx` | התנתקות עם אישור; מפנה לשורש | UI |
| `src/components/settings/telegram-integration.tsx` | כרטיס החיבור: שדה Token **write-only**, Save / Test / Disconnect, וקוד `/start` עם העתקה | [[telegram-integration]] |
| `src/hooks/use-telegram-integration.ts` | שאילתה + שלוש מוטציות; כל אחת מזינה את המטמון בסטטוס שחזר | [[hooks]] |

### שדה שאי אפשר לקרוא ממנו

שדה ה-Bot Token אינו מקבל ערך התחלתי ולא מציג מסכה. `GET /api/v1/integrations/telegram`
מחזיר פרויקציה שאין בה טוקן, ולכן אין מה למלא מראש — ומסכה הייתה **משדרת שקר**:
שהאפליקציה יכולה לקרוא את הסוד בחזרה, בעוד שהיא במכוון אינה יכולה.

## Open Questions
- `account-actions.tsx` מכיל התנתקות בלבד — אין מחיקת חשבון, ואין endpoint שתומך בה.
- `changePasswordSchema` משתמשת ב-`.refine` להתאמת סיסמאות, ולכן היא `ZodEffects` ולא ניתנת ל-`.partial()` אם יידרש בעתיד.
- לא קיים אימות אימייל: שינוי כתובת דרך `PATCH /api/v1/me` לא מפעיל מייל אימות.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד עשרת קבצי ההגדרות ושני נתיבי הכתיבה השונים (API לפרופיל, SDK ישיר לסיסמה).
- **Decisions:** הודגש במפורש ששינוי סיסמה עוקף את ה-API — זו חריגה מהכלל "כל כתיבה עוברת ב-API" ב-[[project-overview]], והיא מוצדקת בדרישת ה-re-authentication.
- **Notes / Caveats:** אם אי פעם ייכתב ל-`users/{uid}` ממקום נוסף מלבד `PATCH /api/v1/me`, ההבטחה ש-Auth והמסמך לא נפרדים תישבר.
- **Related:** [[auth]], [[api-routes]], [[services-server]], [[types-domain]], [[hooks]]

### 2026-08-05 — הוספת כרטיס Telegram [shipped]
- **What was done:** `SettingsView` קיבל סעיף חיבורים — `TelegramIntegration` ברוחב מלא מתחת לשני כרטיסי החשבון, עם שדה Token, שלושת הכפתורים, וקוד ה-`/start`.
- **Decisions:** רוחב מלא ולא בתוך הרשת של שתי העמודות — זה הסעיף היחיד כאן עם זרימה רב-שלבית, והוראות ההקמה צריכות מקום. השדה נשאר ריק ולא ממוסך, כדי לא לרמוז שהאפליקציה יכולה לקרוא את הסוד.
- **Notes / Caveats:** המסך **לא נצפה מחובר** בסשן הזה — הוא מאחורי `AuthGate`. עבר typecheck ו-lint בלבד.
- **Related:** [[telegram-integration]], [[ai-agent]], [[hooks]], [[api-routes]]
