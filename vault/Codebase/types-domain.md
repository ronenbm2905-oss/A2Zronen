# Domain Types

## Overview

`src/types` הוא שכבת החוזים של המערכת — טיפוסים בלבד, בלי לוגיקה ובלי תלות ב-SDK כלשהו. כל שכבה אחרת מייבאת מכאן.

שלוש מוסכמות שחוזרות בכל הקבצים:

1. **כל איחוד סגור מגובה במערך `const`.** `TASK_STATUSES` הוא ערך *ו*טיפוס, כך ש-Zod (`z.enum`), אפשרויות `<select>` ומפות תוויות ממצות קוראות כולן מאותו מקור יחיד.
2. **ערכי enum באנגלית snake_case** (`in_progress`) — הם נשמרים ב-Firestore, מופיעים ב-query params ומאונדקסים. עברית היא עניין תצוגה וחיה ב-[[constants]].
3. **חותמות זמן הן `ISODateString`.** `Timestamp` של Firestore לא חוצה את הגבול הזה — ראה [[firebase-integration]].

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/types/common.ts` | פרימיטיבים משותפים: `ID`, `ISODateString`, `Nullable<T>`, `Maybe<T>`, `DeepPartial<T>`, `Timestamps`, `Paginated<T>` | בסיס — נצרך בכל הקבצים האחרים |
| `src/types/api.ts` | מעטפת התגובה: `ApiSuccess<T>`, `ApiFailure`, `ApiErrorBody`, `ApiResponse<T>` (איחוד מובחן לפי `success`), `PaginationParams` | חוזה API — נצרך ע"י [[api-layer]] ו-[[api-client]] |
| `src/types/task.ts` | `Task`, `TaskStatus`, `TaskPriority`, `TaskDueFilter`, `TaskSortField`, `SortDirection`, `TaskFilter` + מערכי ה-`const` המקבילים | דומיין — [[tasks-feature]] |
| `src/types/project.ts` | `Project`: `id`, `userId`, `name`, `description`, `color`, חותמות זמן | דומיין — [[projects-feature]] |
| `src/types/tag.ts` | `Tag`: `id`, `userId`, `name`, `color`, חותמות זמן | דומיין — [[tags-feature]] |
| `src/types/color.ts` | `COLOR_TOKENS` — פלטה סגורה של 10 טוקנים (`sky`…`destructive`), `ColorToken`, `DEFAULT_COLOR_TOKEN`. איחוד סגור ולא hex חופשי, כדי שתוכן מהמשתמש לא ייפול מחוץ למערכת העיצוב או יישבר ב-dark mode | דומיין — [[constants]], [[tags-feature]], [[projects-feature]] |
| `src/types/user.ts` | `AuthUser` (זהות מטוקן מאומת בלבד) ו-`UserProfile` (מסמך המראה `users/{uid}`) | דומיין — [[auth]], [[settings-feature]] |
| `src/types/integration.ts` | `TelegramIntegrationStatus` (הפרויקציה ללקוח) ו-`TelegramIntegration` (המסמך המאוחסן, נושא `botTokenSealed`), `TELEGRAM_LINK_STATES` | דומיין — [[telegram-integration]] |
| `src/types/index.ts` | barrel. מייצא טיפוסים כ-`export type` ואיחודים סגורים כערך + טיפוס | גבול מודול |

### הערות נבחרות

- **`TaskFilter` חייב להיות ניתן לייצוג כמחרוזת** — הוא עושה round-trip דרך ה-URL search params ב-[[tasks-feature]].
- **`Task.dueDate` הוא רגע שמשמעותו יום** — הרגע של חצות מקומית בתחילת יום היעד. ראה [[utils]].
- **`Task.description` הוא `""` ולא `null`** כשריק, מה שמפשט diff וחוקים.
- **`Task.completedAt`** נכתב בצד השרת כשהסטטוס הופך ל-`done` ומתאפס ביציאה ממנו — הלקוח לא שולט בו.
- **`AuthUser` לעולם לא מורכב מגוף בקשה** — רק מ-`requireUser()` בשרת או מ-AuthProvider בלקוח.
- **`UserProfile`**: Firebase Auth נשאר מקור האמת ל-`displayName` ו-`email`; המסמך קיים כדי שנתוני הפרופיל יהיו ניתנים לשאילתה לצד שאר נתוני הדייר. רק `PATCH /api/v1/me` כותב אותו, ואותו handler מעדכן גם את Auth באותה קריאה — כך שהשניים לא יכולים להיפרד.
- **`TelegramIntegrationStatus` מול `TelegramIntegration`** הוא הפיצול היחיד כאן
  שהוא **מנגנון אבטחה ולא נוחות**. לטיפוס שחוזר מה-endpoint אין שדה שטוקן יכול לשבת בו,
  ולכן "הטוקן לא חוזר ללקוח" נאכף בקומפיילר ולא בזהירות של מי שכותב handler.

## Open Questions
- `Paginated<T>`, `PaginationParams`, `DeepPartial<T>` ו-`Timestamps` מוגדרים אך אינם בשימוש בשום מקום — נכתבו עבור שלבים עתידיים.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד שמונת קבצי הטיפוסים, שלוש המוסכמות החוצות, וההערות הלא-מובנות מאליהן על `dueDate`, `completedAt` ו-`UserProfile`.
- **Decisions:** תועד כמודול נפרד מ-[[schemas-validation]] אף שהם חוזה משלים — הטיפוסים מתארים מה *יוצא* מהמערכת, הסכמות מאמתות מה *נכנס*.
- **Notes / Caveats:** ארבעה טיפוסים מוגדרים אך לא בשימוש; אין להסיק מקיומם שיש pagination.
- **Related:** [[schemas-validation]], [[constants]], [[firebase-integration]], [[api-layer]], [[project-overview]]
