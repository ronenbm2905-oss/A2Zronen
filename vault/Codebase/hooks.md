# Hooks

## Overview

`src/hooks` הוא שכבת המצב של הלקוח. הקומפוננטות ב-`src/components` הן תצוגה כמעט טהורה; כל מה שהוא מצב, מוטציה או נגזרת חי כאן.

חלוקה לחמש משפחות:

| משפחה | קבצים | תפקיד |
|---|---|---|
| קריאה | `use-collections`, `use-realtime-collection` | נתונים חיים מ-Firestore |
| כתיבה | `use-*-mutations` | קריאות API + עדכון אופטימי |
| נגזרות | `use-dashboard-stats`, `use-task-filters` | חישוב מעל נתונים קיימים |
| טפסים | `use-zod-form`, `use-confirm` | מצב טופס ואישור |
| סביבה | `use-auth`, `use-media-query`, `use-toasts` | context ו-APIs של הדפדפן |

**כל hook של מוטציה עוקב אחרי אותה תבנית**: `useMutation` → `useApiFetch` → `endpoints.*` → עדכון אופטימי על `queryKeys.*` → `toast` בהצלחה/כישלון → `toHebrewMessage` לשגיאה. העקביות הזו היא הסיבה שאפשר להוסיף פיצ'ר חדש בלי להמציא מחדש טיפול בשגיאות.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/hooks/use-auth.ts` | `useAuth()` — context מוקלד; `useApiFetch()` — `apiFetch` עם טוקן המשתמש הנוכחי | [[auth]], [[api-client]] |
| `src/hooks/use-realtime-collection.ts` | הגשר בין `onSnapshot` ל-React Query. מייצא `SubscribeFn<T>` | [[data-fetching-query]] |
| `src/hooks/use-collections.ts` | `useTasks`, `useProjects`, `useTags`, `useTask(id)`, `useProject(id)`, ו-`useLookups()` — מפות `Map` לחיפוש O(1) של פרויקטים ותגיות, ה-join שמשמש בכל מסך | [[services-client]] |
| `src/hooks/use-task-mutations.ts` | `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useToggleTaskStatus`, `useSetTaskPriority` | [[tasks-feature]] |
| `src/hooks/use-project-mutations.ts` | `useCreateProject`, `useUpdateProject`, `useDeleteProject` | [[projects-feature]] |
| `src/hooks/use-tag-mutations.ts` | `useCreateTag`, `useUpdateTag`, `useDeleteTag` | [[tags-feature]] |
| `src/hooks/use-profile-mutations.ts` | `useUpdateProfile`, `useChangePassword` | [[settings-feature]] |
| `src/hooks/use-telegram-integration.ts` | `useTelegramIntegration` + `useConnectTelegram` / `useTestTelegramConnection` / `useDisconnectTelegram`. **ה-hook היחיד שקורא ב-`useQuery` רגיל** — הקולקציה דחויה ללקוח ב-`firestore.rules`, ולכן אין `onSnapshot` להירשם אליו | [[telegram-integration]] |
| `src/hooks/use-task-filters.ts` | מצב המסננים כ-round-trip דרך ה-URL (`useSearchParams`), `DEFAULT_TASK_FILTER`, ו-`selectTasks(tasks, filter)` — הסינון והמיון בפועל | [[tasks-feature]] |
| `src/hooks/use-dashboard-stats.ts` | `useDashboardStats()` + הטיפוס `DashboardStats`; מחשב ספירות, פילוחים ורשימות מעל `useTasks` | [[dashboard-feature]] |
| `src/hooks/use-zod-form.ts` | מצב טופס קליל מעל סכמת Zod: ערכים, `FieldErrors`, submit, מצב טעינה | [[schemas-validation]] |
| `src/hooks/use-confirm.ts` | `useConfirm<T>(onConfirm)` — מצב פתיחה/יעד/טעינה לדיאלוגי אישור | [[components-common]] |
| `src/hooks/use-media-query.ts` | `useMediaQuery(query)` ו-`useIsDesktop()` מעל `useSyncExternalStore` | [[layout-shell]] |
| `src/hooks/use-toasts.ts` | `useToasts()` — מנוי לחנות ה-toast דרך `useSyncExternalStore` | [[toasts-notifications]] |
| `src/hooks/index.ts` | barrel לכל ה-hooks | גבול מודול |

### נקודות שכדאי לדעת

- **`useLookups()`** מחזיר מפות מאונדקסות (`indexById` מ-[[utils]]) — זה ה-join בין משימה לפרויקט/תגיות, וכל כרטיס משימה נשען עליו.
- **`selectTasks`** היא פונקציה טהורה מיוצאת בנפרד מה-hook, כך שאפשר לסנן רשימת משימות בלי להיות בתוך קומפוננטה.
- **`useMediaQuery` ו-`useToasts` משתמשים ב-`useSyncExternalStore`** — הבחירה הנכונה ל-React 19 עבור מקורות חיצוניים, ומונעת tearing ברינדור מקבילי.
- **מצב המסננים חי ב-URL** ולא בקומפוננטה, ולכן מסך משימות מסונן ניתן לשיתוף ולרענון.

## Open Questions
- `use-task-filters.ts` הוא הקובץ הארוך והצפוף ביותר בשכבה (סינון, מיון וסריאליזציה לURL באותו מקום) — מועמד לפיצול אם יתווספו מסננים.
- לא נבדק אם `useSetTaskPriority` בשימוש ב-UI כלשהו.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד 14 קבצי ה-hooks, חלוקה לחמש משפחות, והתבנית האחידה של hook מוטציה.
- **Decisions:** `use-realtime-collection.ts` מופיע כאן בטבלה אך מתועד לעומק ב-[[data-fetching-query]] — הוא תשתית, לא hook של פיצ'ר.
- **Notes / Caveats:** התבנית האחידה של המוטציות היא נכס; hook חדש שסוטה ממנה יישבר בשקט בטיפול בשגיאות או בעדכון האופטימי.
- **Related:** [[data-fetching-query]], [[api-client]], [[tasks-feature]], [[toasts-notifications]], [[utils]], [[auth]]
