# App Routing

## Overview

`src/app` הוא ה-App Router של **Next.js 16.3**. הניתוב בנוי משלוש **route groups**, וכל אחת מקבלת layout וכללי גישה משלה:

| קבוצה | נתיבים | שער | Layout |
|---|---|---|---|
| `(marketing)` | `/` | ציבורי | header + footer שיווקיים |
| `(auth)` | `/login`, `/register`, `/forgot-password` | `GuestGate` (מפנה מחוברים) | כרטיס ממורכז |
| `(app)` | `/dashboard`, `/tasks`, `/projects`, `/tags`, `/settings` | `AuthGate` (דורש התחברות) | `AppShell` |

הסוגריים אומרים ש-Next לא מתרגם את שם הקבוצה לקטע URL — הן קיימות אך ורק כדי לתת layout וגבול גישה שונים.

### הדפים דקים במכוון

כל `page.tsx` עושה שני דברים בלבד: מייצא `metadata` ומרנדר קומפוננטת view אחת מ-`src/components`. הלוגיקה חיה ב-view וב-[[hooks]]. זה מה שמאפשר לדפים להישאר Server Components בזמן שה-view הוא `"use client"`.

`PageProps<"/tasks/[id]">` הוא טיפוס שנוצר ע"י `next typegen` — הפרמטרים הם `Promise` ב-Next 16, ולכן הדפים הדינמיים הם `async`.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/app/layout.tsx` | root layout: פונטים, metadata, `lang="he"` `dir="rtl"`, `AppProviders` | [[layout-shell]] |
| `src/app/globals.css` | מערכת העיצוב | [[design-system]] |
| `src/app/error.tsx` | error boundary ברמת השורש; מלוגג דרך `logger` | [[errors-handling]] |
| `src/app/global-error.tsx` | boundary אחרון — מחליף גם את ה-`<html>` כשה-root layout עצמו נכשל | [[errors-handling]] |
| `src/app/not-found.tsx` | 404 עם `ButtonLink` חזרה | [[components-common]] |
| `src/app/favicon.ico` | אייקון האתר | נכס |
| `(marketing)/layout.tsx` | header + footer שיווקיים | [[marketing-site]] |
| `(marketing)/page.tsx` | דף הבית: Hero, FeatureGrid, HowItWorks, CtaBand | [[marketing-site]] |
| `(auth)/layout.tsx` | `GuestGate` בתוך `Suspense` (נדרש בגלל `useSearchParams`) | [[auth]] |
| `(auth)/login/page.tsx` · `register/page.tsx` · `forgot-password/page.tsx` | דפי ההזדהות | [[auth]] |
| `(app)/layout.tsx` | `AuthGate` → `AppShell` | [[auth]], [[layout-shell]] |
| `(app)/error.tsx` | error boundary לאזור האפליקציה | [[errors-handling]] |
| `(app)/dashboard/page.tsx` + `loading.tsx` | לוח הבקרה | [[dashboard-feature]] |
| `(app)/tasks/page.tsx` + `loading.tsx` | רשימת משימות. עטוף ב-`Suspense` בגלל `useSearchParams` במסננים | [[tasks-feature]] |
| `(app)/tasks/[id]/page.tsx` + `loading.tsx` | משימה בודדת (`async`, `PageProps`) | [[tasks-feature]] |
| `(app)/projects/page.tsx` + `loading.tsx` | רשימת פרויקטים | [[projects-feature]] |
| `(app)/projects/[id]/page.tsx` + `loading.tsx` | פרויקט בודד | [[projects-feature]] |
| `(app)/tags/page.tsx` + `loading.tsx` | תגיות | [[tags-feature]] |
| `(app)/settings/page.tsx` | הגדרות (ללא `loading.tsx`) | [[settings-feature]] |
| `src/app/api/**` | נתיבי ה-API | [[api-routes]] |

### `Suspense` — מתי ולמה

`useSearchParams` מכריח את הקומפוננטה לרינדור בצד הלקוח. Next דורש גבול `Suspense` סביבה, אחרת הבנייה נכשלת. לכן `(auth)/layout.tsx` ו-`(app)/tasks/page.tsx` עוטפים במפורש — שניהם קוראים את ה-search params (`redirect` ומצב המסננים בהתאמה).

## Open Questions
- ל-`/settings` אין `loading.tsx` בעוד לכל שאר נתיבי `(app)` יש — ככל הנראה השמטה, לא החלטה.
- `metadata` מוגדר בכל דף בנפרד; אין `generateMetadata` דינמי לדפי `[id]`, כך שכותרת הטאב של משימה בודדת היא גנרית.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד שלוש קבוצות הניתוב, שערי הגישה שלהן, 30 קבצי הניתוב, ומתי נדרש `Suspense`.
- **Decisions:** נתיבי ה-API מוזכרים כאן בשורה אחת ומתועדים במלואם ב-[[api-routes]] — הם שטח שונה לגמרי מדפי UI.
- **Notes / Caveats:** זו גרסת Next שבה `params` הוא `Promise` וקונבנציית `middleware` הוחלפה ב-`proxy` — אל תניחו ידע מגרסאות קודמות. ראה [[build-tooling]].
- **Related:** [[layout-shell]], [[auth]], [[tasks-feature]], [[api-routes]], [[components-common]], [[marketing-site]]
