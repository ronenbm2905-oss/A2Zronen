# Tags Feature

## Overview

תגית היא תווית בעלת שם וצבע. הקשר למשימות הוא **רבים-לרבים**, ממומש כמערך `Task.tagIds` — כלומר הצד ה"בעלים" של הקשר הוא המשימה, ולתגית עצמה אין רשימת משימות.

ההשלכה: **מחיקת תגית חייבת לנקות אותה מכל המשימות שמפנות אליה.** זו הפעולה היחידה כאן שאינה CRUD פשוט, והיא חיה ב-`tag.service.ts`.

`sameMembers` מ-[[utils]] קיים בשביל הפיצ'ר הזה — השוואת `tagIds` ללא תלות בסדר, בעדכונים אופטימיים.

## Files

| קובץ | מה הוא עושה | שכבה |
|---|---|---|
| `src/types/tag.ts` | `Tag`: `id`, `userId`, `name`, `color`, חותמות זמן | [[types-domain]] |
| `src/lib/schemas/tag.schema.ts` | `createTagSchema`, `updateTagSchema` | [[schemas-validation]] |
| `src/app/api/v1/tags/route.ts` | `GET`, `POST` | [[api-routes]] |
| `src/app/api/v1/tags/[id]/route.ts` | `GET`, `PATCH`, `DELETE` | [[api-routes]] |
| `src/services/server/tag.service.ts` | CRUD + ניקוי `tagIds` במשימות בעת מחיקה | [[services-server]] |
| `src/hooks/use-tag-mutations.ts` | `useCreateTag`, `useUpdateTag`, `useDeleteTag` | [[hooks]] |
| `src/app/(app)/tags/page.tsx` + `loading.tsx` | נתיב התגיות | [[app-routing]] |
| `src/components/tags/tags-view.tsx` | מסך התגיות: רשימה, ספירת שימוש לכל תגית (דרך `useTasks`), עריכה ומחיקה | UI |
| `src/components/tags/tag-chip.tsx` | שבב תגית לפי `COLOR_CHIP_CLASSES` | UI — [[constants]] |
| `src/components/tags/tag-form-dialog.tsx` | טופס יצירה/עריכה עם `ColorPicker` | UI |
| `src/components/tasks/task-tag-picker.tsx` | בחירת תגיות מרובה בטופס המשימה, כולל קישור ליצירת תגית חדשה | UI — [[tasks-feature]] |

## Open Questions
- מחיקת תגית עם הרבה משימות משויכות — לא אומת אם הניקוי מתבצע ב-`WriteBatch` יחיד (מוגבל ל-500 פעולות ב-Firestore) או בסבבים.
- אין מיזוג או שינוי שם המוני של תגיות.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד 11 קבצי הפיצ'ר ותיעוד יחס הרבים-לרבים כמערך על המשימה.
- **Decisions:** `task-tag-picker.tsx` מופיע גם כאן וגם ב-[[tasks-feature]] — מיקומו בתיקיית tasks אבל תחום האחריות שלו משותף.
- **Notes / Caveats:** מגבלת 500 הפעולות ב-`WriteBatch` היא הסיכון הממשי היחיד שזוהה בפיצ'ר הזה.
- **Related:** [[tasks-feature]], [[projects-feature]], [[services-server]], [[constants]], [[utils]]
