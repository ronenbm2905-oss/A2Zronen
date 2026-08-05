# Data Fetching & Realtime Bridge

## Overview

המודול הזה פותר בעיה אחת: **`useQuery` רוצה promise שאפשר להמתין לו פעם אחת, ו-`onSnapshot` רוצה לקרוא בחזרה שוב ושוב.**

הפתרון הוא רישום (registry) ב-`lib/query/realtime.ts`. ה-effect שפותח את המנוי פותר את ה-promise הממתין עם ה-snapshot ה**ראשון**; כל snapshot אחריו נכתב ישירות למטמון של React Query.

התמורה: `isLoading` / `isError` / `data` מתנהגים בדיוק כמו בשאילתה רגילה, כך ש-`<LoadingState>` ו-`<ErrorState>` מתחברים באותה צורה, והקומפוננטות **לעולם לא לומדות שהנתונים שלהן חיים**.

הרישום ממופתח לפי `hashKey(queryKey)` של React Query עצמו, כך שהרישום והמטמון מסכימים על זהות מעצם הבנייה.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/lib/query/realtime.ts` | הרישום: `awaitFirstSnapshot(hash)` (נקרא מה-`queryFn`), `settleFirstSnapshot(hash, rows)`, `rejectFirstSnapshot(hash, error)`, `discardFirstSnapshot(hash)`. ממופתח לפי hash, type-erased עם המרה יחידה | תשתית — הגשר עצמו |
| `src/lib/query/keys.ts` | `queryKeys` — מפעל מפתחות מרוכז (`tasks`, `projects`, `tags`, `profile`). מייצא גם את הטיפוס `QueryKeys` | חוזה מטמון — נצרך ע"י כל ה-hooks של המוטציות |
| `src/lib/query/client.ts` | `makeQueryClient()` — יוצר `QueryClient` עם ברירות המחדל של הפרויקט | תשתית — נצרך ע"י `QueryProvider` ב-[[layout-shell]] |
| `src/hooks/use-realtime-collection.ts` | ה-hook שמחבר הכל: מקבל `SubscribeFn<T>`, פותח את המנוי ב-`useEffect`, מפנה snapshots למטמון, ומנקה בעת unmount. מייצא גם את הטיפוס `SubscribeFn` | גשר — נצרך ע"י `use-collections.ts` |

### הזרימה המלאה

```
useTasks()                          ← [[hooks]]
  → useRealtimeCollection(subscribeTasks, queryKeys.tasks(uid))
      queryFn:  awaitFirstSnapshot(hash)      ← ממתין
      useEffect: subscribeTasks(...)          ← [[services-client]]
                   onFirst → settleFirstSnapshot(hash, rows)
                   onData  → queryClient.setQueryData(key, rows)
                   onError → rejectFirstSnapshot(hash, error)
      cleanup:  unsubscribe() + discardFirstSnapshot(hash)
```

### למה `queryKeys` מרוכז

מפתחות המטמון הם החוזה בין נתיב הקריאה (realtime) לנתיב הכתיבה (מוטציות ב-[[hooks]]). עדכון אופטימי כותב לאותו מפתח שהמנוי מזין; אילו היו מוגדרים inline, אי-התאמה קטנה הייתה מייצרת שני ערכי מטמון שלא מסתנכרנים לעולם.

## Open Questions
- `discardFirstSnapshot` קיים בשביל ניקוי, אך לא נבדק כאן מה קורה כששני mounts של אותו מפתח קורים כמעט במקביל — הרישום מחזיק מערך של waiters, כך שזה כנראה מטופל, אך לא אומת בפועל.
- אין `staleTime`/`gcTime` מותאם שמתועד; שווה בדיקה ב-`makeQueryClient()` לפני שמניחים התנהגות מטמון כלשהי.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד הגשר בין מנויי Firestore ל-React Query, ארבעת קבציו, והזרימה המלאה מ-`useTasks` ועד ה-cleanup.
- **Decisions:** `use-realtime-collection.ts` תועד כאן ולא ב-[[hooks]] — הוא תשתית הגשר, לא hook של פיצ'ר.
- **Notes / Caveats:** הפואנטה המרכזית היא שקומפוננטות לא יודעות שהנתונים חיים; כל שינוי כאן חייב לשמר את זה, אחרת כל מסך יצטרך טיפול נפרד ב-realtime.
- **Related:** [[services-client]], [[hooks]], [[layout-shell]], [[project-overview]]
