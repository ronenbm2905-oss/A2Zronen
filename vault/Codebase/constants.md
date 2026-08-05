# Constants

## Overview

`src/constants` הוא שכבת התצוגה של האיחודים הסגורים מ-[[types-domain]]. הכלל שמפריד בין השניים: **`src/types` מחזיק את הערך שנשמר, `src/constants` מחזיק את מה שהמשתמש רואה.**

לכן `TASK_STATUSES` (הערכים `todo`/`in_progress`/`done`) חי ב-types, ואילו `TASK_STATUS_LABELS` (התוויות בעברית) חי כאן. ערכי enum באנגלית נשמרים ב-Firestore ומאונדקסים; עברית לעולם לא נכנסת לבסיס הנתונים.

כל המפות כאן הן `Record<Union, T>` **ממצות** — הוספת ערך לאיחוד תשבור את הקומפילציה עד שכל מפה תעודכן. זה מכוון.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/constants/task.ts` | `TASK_STATUS_LABELS`, `TASK_PRIORITY_LABELS`, `TASK_DUE_FILTER_LABELS`, `TASK_SORT_LABELS` (תוויות עברית); `TASK_PRIORITY_RANK`, `TASK_STATUS_RANK` (סדר מיון); `TASK_STATUS_BADGE`, `TASK_PRIORITY_BADGE` (וריאנט תג); `TASK_PRIORITY_ACCENT` (מחלקת הדגשה); `DEFAULT_TASK_STATUS`, `DEFAULT_TASK_PRIORITY` | [[tasks-feature]] |
| `src/constants/color.ts` | `COLOR_LABELS` (שמות צבע בעברית), `COLOR_DOT_CLASSES` ו-`COLOR_CHIP_CLASSES` (מחלקות Tailwind לכל טוקן). מעביר הלאה את `COLOR_TOKENS` | [[tags-feature]], [[projects-feature]], [[ui-primitives]] |
| `src/constants/limits.ts` | `LIMITS` — מגבלות אורך שדות ותקרות שאילתה. מוזן גם ל-[[schemas-validation]] וגם ל-`maxLength` ומוני תווים ב-UI, כך שטופס לא יכול לקבל קלט שה-API ידחה | חוצה שכבות |
| `src/constants/nav.ts` | `APP_NAV_ITEMS` והטיפוס `NavItem` — פריטי הניווט הראשי (label, href, icon) | [[layout-shell]] |
| `src/constants/index.ts` | barrel | גבול מודול |

### למה `LIMITS` הוא הקובץ החשוב כאן

הוא הנקודה היחידה שבה גבול ה-UI וגבול ה-API מוגדרים יחד. כל מספר קסם ב-`maxLength` של שדה שלא מגיע מכאן הוא באג ממתין: הטופס יקבל קלט שהשרת יחזיר עליו 400.

## Open Questions
- `COLOR_DOT_CLASSES` ו-`COLOR_CHIP_CLASSES` הן מחרוזות Tailwind מלאות (לא מורכבות דינמית) — נדרש כדי ש-Tailwind יסרוק אותן. יש לשמור על הצורה הזו בכל הוספת טוקן.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד חמשת קבצי הקבועים והכלל שמפריד ביניהם לבין [[types-domain]].
- **Decisions:** הודגש ש-`LIMITS` הוא נקודת האמת המשותפת בין הטופס ל-API — זו התלות הכי קלה לשבור בשוגג.
- **Notes / Caveats:** המפות ממצות בכוונה; הוספת ערך לאיחוד ב-types תיכשל בקומפילציה עד שכל המפות כאן יעודכנו — זו תכונה, לא מכשול.
- **Related:** [[types-domain]], [[schemas-validation]], [[tasks-feature]], [[ui-primitives]], [[layout-shell]]
