# Dashboard Feature

## Overview

לוח הבקרה הוא **תצוגה נגזרת בלבד** — אין לו endpoint, אין לו קולקציה ואין לו מוטציות משלו. כל מה שהוא מציג מחושב ב-`useDashboardStats()` מעל אותן משימות שכבר נמצאות במטמון מהמנוי החי של [[data-fetching-query]].

זו הסיבה שהמסך מתעדכן מיידית כשמשימה משתנה במסך אחר: המקור זהה.

החישוב עצמו נשען על `countBy` מ-[[utils]] ועל `isToday` / `isPastDue`, ומייצר:
- ספירות ראשיות (סה"כ, הושלמו, להיום, באיחור)
- פילוחים לפי סטטוס ולפי עדיפות (ל-`BreakdownBar`)
- רשימות קצרות (באיחור, להיום, קרוב)

המוטציות במסך (עריכה, מחיקה, יצירה) הן של [[tasks-feature]] — הלוח רק מארח את הדיאלוגים.

## Files

| קובץ | מה הוא עושה | שכבה |
|---|---|---|
| `src/hooks/use-dashboard-stats.ts` | `useDashboardStats()` + הטיפוס `DashboardStats` — כל החישוב | [[hooks]] |
| `src/app/(app)/dashboard/page.tsx` + `loading.tsx` | הנתיב | [[app-routing]] |
| `src/components/dashboard/dashboard-view.tsx` | המסך: מרכיב את ארבעת החלקים, מחזיק את מצב הדיאלוגים ואת מצבי טעינה/ריק | UI |
| `src/components/dashboard/dashboard-stats.tsx` | `DashboardStatsRow` — ארבעה `StatCard` עם קישור לרשימה המסוננת המתאימה | UI — [[components-common]] |
| `src/components/dashboard/dashboard-breakdowns.tsx` | פילוחי סטטוס ועדיפות מעל `BreakdownBar` | UI |
| `src/components/dashboard/dashboard-lists.tsx` | שלוש רשימות קצרות (באיחור / היום / קרוב) מעל `TaskCard` במצב `compact` | UI — [[tasks-feature]] |
| `src/components/dashboard/quick-actions.tsx` | כפתורי "משימה חדשה" ו"פרויקט חדש" | UI |

## Open Questions
- כרטיסי המדדים מקשרים לרשימת המשימות עם מסננים ב-query string; יש לוודא שהמסננים שהם בונים תואמים בדיוק לחישוב ב-`useDashboardStats`, אחרת המספר בכרטיס לא יתאים למספר השורות במסך היעד.
- אין תצוגת מגמה או היסטוריה — `completedAt` נשמר אך לא מנוצל לגרף.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד שבעת קבצי הלוח והעובדה שהוא נגזרת טהורה ללא שכבת נתונים משלו.
- **Decisions:** תועד כפיצ'ר נפרד למרות שאין לו backend — יש לו hook, מסכים והתנהגות משלו, ומיזוגו ל-[[tasks-feature]] היה מסתיר את זה.
- **Notes / Caveats:** הסיכון העיקרי כאן הוא סחיפה בין חישוב המדד לבין המסנן שהכרטיס מקשר אליו — שני מקומות שצריכים להסכים ואין ביניהם קשר בקוד.
- **Related:** [[tasks-feature]], [[hooks]], [[data-fetching-query]], [[components-common]], [[utils]]
