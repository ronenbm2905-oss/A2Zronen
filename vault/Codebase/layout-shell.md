# Layout & Providers

## Overview

שני דברים שקשה להפריד: **מעטפת האפליקציה** (sidebar, topbar, ניווט) ו-**שרשרת ה-Providers** שעוטפת את כל העץ.

### סדר ה-Providers

`AppProviders` מרכיב אותם ב-`src/app/layout.tsx`:

```
DirectionProvider (rtl)   ← כיוון לכל פרימיטיבי base-ui
  QueryProvider           ← QueryClient (נוצר ב-useState, אחד לכל mount)
    AuthProvider          ← onAuthStateChanged; מנקה מטמון בהחלפת משתמש
      TooltipProvider
        {children}
        Toaster
```

הסדר אינו שרירותי: `AuthProvider` נמצא **בתוך** `QueryProvider` כי הוא קורא ל-`useQueryClient()` כדי לנקות את המטמון כשמשתמש מתחלף — בלי זה, נתוני משתמש קודם היו נשארים במטמון אחרי התחברות מחדש.

`QueryClient` נוצר בתוך `useState` ולא כמשתנה מודול, כדי שלא ישותף בין בקשות בשרת.

### המעטפת

`AppShell` מחזיק את מצב דיאלוג יצירת המשימה במקום אחד, כך שגם ה-topbar וגם פעולות מהירות בלוח הבקרה פותחים את אותו טופס. במובייל ה-sidebar מוגש דרך `Sheet`; בדסקטופ הוא קבוע.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/app/layout.tsx` | ה-root layout. טוען את הפונטים **Fredoka** (כותרות) ו-**Rubik** (גוף), מגדיר `metadata`, `lang="he"` / `dir="rtl"`, ועוטף ב-`AppProviders` | ניתוב — [[app-routing]] |
| `src/components/providers/app-providers.tsx` | מרכיב את שרשרת ה-Providers ומרנדר את `Toaster` | תשתית |
| `src/components/providers/query-provider.tsx` | `QueryClientProvider` מעל `makeQueryClient()`, ב-`useState` | [[data-fetching-query]] |
| `src/components/providers/auth-provider.tsx` | מצב האימות, פעולות וניקוי מטמון. מתועד לעומק ב-[[auth]] | [[auth]] |
| `src/components/layout/app-shell.tsx` | פריסת האפליקציה + הבעלות על דיאלוג יצירת משימה | [[tasks-feature]] |
| `src/components/layout/app-sidebar.tsx` | ניווט ראשי מ-`APP_NAV_ITEMS`; מקבל `onNavigate` לסגירה במובייל | [[constants]] |
| `src/components/layout/app-topbar.tsx` | סרגל עליון: כפתור תפריט (`Sheet`), כפתור משימה חדשה, `UserMenu` | — |
| `src/components/layout/nav-link.tsx` | קישור ניווט יחיד עם הדגשת מצב פעיל לפי `usePathname` | — |
| `src/components/layout/user-menu.tsx` | תפריט משתמש: אווטר, קישור להגדרות, התנתקות | [[auth]], [[settings-feature]] |
| `src/app/(app)/layout.tsx` | עוטף את אזור האפליקציה ב-`AuthGate` ואז ב-`AppShell` | [[auth]] |

## Open Questions
- `useIsDesktop` קיים ב-[[hooks]] אך לא ברור אם ה-shell משתמש בו או מסתמך רק על breakpoints של CSS — שווה בדיקה לפני שינוי התנהגות מובייל.
- `Toaster` מרונדר בתוך `TooltipProvider`; אין לזה משמעות ידועה, אבל זו תלות סדר לא מתועדת.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד שרשרת ה-Providers, הסיבה לסדר שלה, ושמונת קבצי המעטפת והניווט.
- **Decisions:** Providers ומעטפת אוחדו למודול אחד — שניהם "מה שעוטף כל מסך", והפרדתם הייתה מייצרת שני קבצים שמפנים זה לזה בכל שורה.
- **Notes / Caveats:** `AuthProvider` **חייב** להישאר בתוך `QueryProvider`. היפוך הסדר ישבור את ניקוי המטמון בהחלפת משתמש — בשקט, בלי שגיאה.
- **Related:** [[auth]], [[data-fetching-query]], [[ui-primitives]], [[app-routing]], [[constants]]
