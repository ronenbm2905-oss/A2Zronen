# Tasks Feature

## Overview

הפיצ'ר המרכזי של המוצר, והמורכב ביותר: משימה מחזיקה סטטוס, עדיפות, תאריך יעד, שיוך לפרויקט ורשימת תגיות — כלומר היא היחידה שיש לה מפתחות זרים.

### מה שמייחד את הפיצ'ר הזה

- **מצב המסננים חי ב-URL.** `useTaskFilters` עושה round-trip של `TaskFilter` דרך ה-search params, ולכן כל שדה חייב להיות ניתן לייצוג כמחרוזת (ראה `csvOf` ב-[[schemas-validation]]). התוצאה: מסך משימות מסונן ניתן לשיתוף, לסימניה ולרענון.
- **הסינון והמיון קורים בלקוח.** `selectTasks(tasks, filter)` היא פונקציה טהורה שרצה מעל כל המשימות שהגיעו במנוי ה-realtime. השרת מקבל `taskFilterSchema` ב-`GET /api/v1/tasks`, אבל המסך עצמו לא מחכה לו.
- **מפתחות זרים מאומתים בשרת.** `assertReferencesOwned` ב-[[services-server]] מוודא שכל `projectId`/`tagIds` שייך למשתמש, ומדווח על מזהה זר כשגיאת **ולידציה** ולא הרשאה.
- **`completedAt` נכתב בשרת** כשהסטטוס הופך ל-`done` — הלקוח לא שולט בו.

## Files

| קובץ | מה הוא עושה | שכבה |
|---|---|---|
| `src/types/task.ts` | `Task`, `TaskStatus`, `TaskPriority`, `TaskFilter`, `TaskDueFilter`, `TaskSortField` | [[types-domain]] |
| `src/lib/schemas/task.schema.ts` | `createTaskSchema`, `updateTaskSchema`, `taskFilterSchema` | [[schemas-validation]] |
| `src/constants/task.ts` | תוויות עברית, דירוגי מיון, וריאנטי תג, ברירות מחדל | [[constants]] |
| `src/app/api/v1/tasks/route.ts` | `GET` (מסונן), `POST` | [[api-routes]] |
| `src/app/api/v1/tasks/[id]/route.ts` | `GET`, `PATCH`, `DELETE` | [[api-routes]] |
| `src/services/server/task.service.ts` | לוגיקה ו-persistence + `assertReferencesOwned` | [[services-server]] |
| `src/hooks/use-task-mutations.ts` | `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useToggleTaskStatus`, `useSetTaskPriority` | [[hooks]] |
| `src/hooks/use-task-filters.ts` | מצב המסננים ב-URL, `DEFAULT_TASK_FILTER`, `selectTasks` | [[hooks]] |
| `src/app/(app)/tasks/page.tsx` + `loading.tsx` | נתיב הרשימה (עטוף ב-`Suspense`) | [[app-routing]] |
| `src/app/(app)/tasks/[id]/page.tsx` + `loading.tsx` | נתיב המשימה הבודדת | [[app-routing]] |
| `src/components/tasks/tasks-view.tsx` | מסך הרשימה: מסננים, רשימה, מצבים ריקים, בעלות על הדיאלוגים | UI |
| `src/components/tasks/task-card.tsx` | כרטיס משימה: checkbox לסימון, תפריט הקשר, תגים, קישור לפרטים. מצב `compact` ללוח הבקרה | UI |
| `src/components/tasks/task-detail.tsx` | מסך פרטי משימה מלא | UI |
| `src/components/tasks/task-badges.tsx` | `TaskStatusBadge`, `TaskPriorityBadge`, `TaskDueBadge`, `ProjectBadge` | UI |
| `src/components/tasks/task-filter-bar.tsx` | חיפוש, סינון וסידור — כותב ל-`useTaskFilters` | UI |
| `src/components/tasks/task-form.tsx` | גוף הטופס (משותף ליצירה ולעריכה) | UI |
| `src/components/tasks/task-form-dialog.tsx` | עוטף את `TaskForm` בדיאלוג ומחבר למוטציות | UI |
| `src/components/tasks/task-tag-picker.tsx` | בחירת תגיות מרובה עם קישור ליצירת תגית חדשה | UI |
| `src/components/tasks/delete-task-dialog.tsx` | אישור מחיקה מעל `ConfirmDialog` | UI |

## Open Questions
- `useSetTaskPriority` מוגדר אך לא אותר לו צרכן ב-UI.
- הסינון בלקוח מניח שכל המשימות נטענו; מעבר לתקרת `LIMITS` במנוי, תוצאות הסינון יהיו חלקיות בלי אינדיקציה למשתמש.
- `TaskDueBadge` מפרמט תאריכים ולכן **חייב** להישאר client component — ראה כלל ה-hydration ב-[[utils]].

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד הפיצ'ר לרוחב כל השכבות — 20 קבצים מטיפוס ועד דיאלוג מחיקה.
- **Decisions:** תועד כחתך אנכי ולא לפי תיקייה, כי מה שחשוב במשימות הוא הזרימה בין השכבות (מסננים ב-URL → סינון בלקוח → מפתחות זרים בשרת).
- **Notes / Caveats:** התלות בין `taskFilterSchema`, `TaskFilter` ו-`useTaskFilters` היא שלושה מקומות שחייבים להסכים; הוספת מסנן דורשת נגיעה בכולם.
- **Related:** [[projects-feature]], [[tags-feature]], [[dashboard-feature]], [[services-server]], [[hooks]], [[types-domain]]
