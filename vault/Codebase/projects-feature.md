# Projects Feature

## Overview

פרויקט הוא מכולה בעלת שם וצבע שמשימות משויכות אליה דרך `Task.projectId` (יחיד, nullable). מודל פשוט משמעותית מ-[[tasks-feature]] — אין מסננים, אין מיון, אין מפתחות זרים משלו.

הנקודה המעניינת היחידה היא **מחיקה**: פרויקט שנמחק משאיר משימות עם `projectId` מיותם, ולכן `project.service.ts` משתמש ב-`FieldValue` כדי לנקות את ההפניה מהמשימות המושפעות.

מסך הפרויקט הבודד מצרף משימות דרך `useTasks()` + סינון מקומי לפי `projectId`, ולא דרך endpoint ייעודי — עוד תוצאה של כך שכל המשימות כבר נמצאות במטמון מהמנוי החי.

## Files

| קובץ | מה הוא עושה | שכבה |
|---|---|---|
| `src/types/project.ts` | `Project`: `id`, `userId`, `name`, `description`, `color`, חותמות זמן | [[types-domain]] |
| `src/lib/schemas/project.schema.ts` | `createProjectSchema`, `updateProjectSchema` | [[schemas-validation]] |
| `src/app/api/v1/projects/route.ts` | `GET`, `POST` | [[api-routes]] |
| `src/app/api/v1/projects/[id]/route.ts` | `GET`, `PATCH`, `DELETE` | [[api-routes]] |
| `src/services/server/project.service.ts` | CRUD + ניקוי הפניות במחיקה דרך `FieldValue` | [[services-server]] |
| `src/hooks/use-project-mutations.ts` | `useCreateProject`, `useUpdateProject`, `useDeleteProject` | [[hooks]] |
| `src/app/(app)/projects/page.tsx` + `loading.tsx` | נתיב הרשימה | [[app-routing]] |
| `src/app/(app)/projects/[id]/page.tsx` + `loading.tsx` | נתיב הפרויקט הבודד (`async`) | [[app-routing]] |
| `src/components/projects/projects-view.tsx` | רשת כרטיסים, מצב ריק, בעלות על הדיאלוגים. סופר משימות לכל פרויקט דרך `useTasks` | UI |
| `src/components/projects/project-card.tsx` | כרטיס עם `ColorDot`, תפריט הקשר (עריכה/מחיקה) וקישור לפרטים | UI |
| `src/components/projects/project-detail.tsx` | מסך הפרויקט: פרטים + המשימות שלו, כולל יצירה ומחיקה של משימות בהקשר | UI |
| `src/components/projects/project-form-dialog.tsx` | טופס יצירה/עריכה מעל `useZodForm` + `ColorPicker` | UI |

## Open Questions
- לא אומת כאן שמחיקת פרויקט אכן מנקה `projectId` בכל המשימות באצווה אחת — רלוונטי אם לפרויקט יש הרבה משימות.
- אין endpoint או UI לארכוב פרויקט; מחיקה היא הפעולה היחידה.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד 12 קבצי הפיצ'ר לאורך כל השכבות, ותיעוד התנהגות המחיקה כנקודה היחידה שאינה CRUD טריוויאלי.
- **Decisions:** צירוף המשימות במסך הפרויקט תועד במפורש כסינון בלקוח ולא כשאילתה — כדי שלא יחפשו endpoint שלא קיים.
- **Notes / Caveats:** `Project.description` הוא `""` כשריק (לא `null`), במקביל ל-`Task.description`.
- **Related:** [[tasks-feature]], [[tags-feature]], [[services-server]], [[hooks]], [[components-common]]
