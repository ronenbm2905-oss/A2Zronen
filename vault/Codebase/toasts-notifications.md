# Toasts & Notifications

## Overview

מערכת ההודעות הצפות היא **חנות חיצונית מינימלית**, לא ספרייה. שלושה חלקים: מודול חנות (`lib/toast.ts`), hook שמנוי אליה (`use-toasts.ts`), ו-renderer (`toaster.tsx`).

הבחירה ב-`useSyncExternalStore` היא הנקודה המעניינת: היא מאפשרת לקרוא ל-`toast.success(...)` **מכל מקום** — מתוך `mutationFn`, מתוך callback, מקוד שאינו React בכלל — בלי להיות בתוך קומפוננטה ובלי context. זו הסיבה שכל hook מוטציה ב-[[hooks]] יכול לדווח הצלחה או כישלון בשורה אחת.

זהו גם ה-API שמופיע בסוף מסלול השגיאה של [[errors-handling]]: `toHebrewMessage(error)` → `toast.error(...)`.

## Files

| קובץ | מה הוא עושה | שכבה |
|---|---|---|
| `src/lib/toast.ts` | החנות: `toast.success/error/info`, `subscribeToToasts(listener)`, `getToasts()`, `dismissToast(id)`, והטיפוסים `Toast` ו-`ToastVariant` | תשתית |
| `src/hooks/use-toasts.ts` | `useToasts()` — מנוי לחנות דרך `useSyncExternalStore` | [[hooks]] |
| `src/components/common/toaster.tsx` | ה-renderer: אייקון לפי וריאנט, כפתור סגירה, אנימציה | UI — [[components-common]] |
| `src/components/providers/app-providers.tsx` | מרנדר את `<Toaster />` פעם אחת בשורש | [[layout-shell]] |

### הזרימה

```
toast.error("...")            ← מכל מקום בקוד
  → החנות מעדכנת ומודיעה למאזינים
  → useSyncExternalStore ב-useToasts מרנדר מחדש
  → Toaster מציג
  → dismissToast(id) או פקיעה אוטומטית
```

## Open Questions
- לא נבדק אם יש תקרה למספר ה-toasts המוצגים בו-זמנית; רצף כשלים (למשל אובדן חיבור) עלול להציף את המסך.
- אין `toast.promise` או וריאנט טעינה — מוטציה ארוכה לא מדווחת התקדמות.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד ארבעת קבצי מערכת ההודעות והסיבה לבחירת `useSyncExternalStore`.
- **Decisions:** תועד כמודול נפרד ולא כחלק מ-[[components-common]] — החנות היא תשתית שנקראת מכל שכבה, לא רכיב UI.
- **Notes / Caveats:** היכולת לקרוא ל-`toast` מחוץ ל-React היא מה שמחזיק את התבנית האחידה של hooks המוטציות; מעבר ל-context היה שובר אותה.
- **Related:** [[hooks]], [[errors-handling]], [[components-common]], [[layout-shell]]
