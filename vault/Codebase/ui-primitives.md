# UI Primitives

## Overview

`src/components/ui` הם פרימיטיבי shadcn בסגנון **`base-nova`**, בנויים מעל **`@base-ui/react`** (ולא Radix). התצורה ב-`components.json` מפעילה `rsc: true` ו-**`rtl: true`** — הפרויקט כולו הוא עברית מימין לשמאל, ו-`DirectionProvider` ב-[[layout-shell]] מזין את כיוון הכתיבה לפרימיטיבים.

הקבצים כאן נוצרו ע"י ה-CLI של shadcn, ולכן הם עוקבים אחרי סגנון שונה משאר הקוד (ללא נקודה-פסיק, מרכאות כפולות). זה תקין — הם קוד ספרייה בבעלות מקומית.

> ⚠️ **`npx shadcn add --overwrite` דורס התאמות מקומיות.** הוספת רכיב חדש עם `--overwrite` החזירה בעבר את `button.tsx` המותאם-מותג לגרסת ברירת המחדל. בדקו את ה-diff אחרי כל הוספה.

עיצוב הצבעים והטוקנים מגיע מ-`src/app/globals.css` — ראה [[design-system]].

## Files

| קובץ | מה הוא עושה | הערות |
|---|---|---|
| `button.tsx` | `Button` + `buttonVariants` (cva) | **מותאם למותג** — לא לדרוס |
| `badge.tsx` | `Badge` + `badgeVariants`; משתמש ב-`useRender` ו-`mergeProps` של base-ui | נצרך ע"י תגי המשימות |
| `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardContent`, ועוד | בסיס כמעט לכל מסך |
| `input.tsx` / `textarea.tsx` / `label.tsx` | שדות טופס | [[components-common]] |
| `checkbox.tsx` | תיבת סימון | סימון משימה כבוצעה |
| `select.tsx` | `Select` על כל חלקיו | עוטף ע"י `SelectField` |
| `dialog.tsx` | דיאלוג מודאלי | כל הטפסים המודאליים |
| `alert-dialog.tsx` | דיאלוג אישור הרסני | `ConfirmDialog` |
| `sheet.tsx` | מגירה צדדית (מעל primitive של Dialog) | סרגל צד במובייל |
| `dropdown-menu.tsx` | תפריט הקשר | תפריטי כרטיס ומשתמש |
| `popover.tsx` | חלונית צפה | בורר תגיות ומסננים |
| `tooltip.tsx` | `Tooltip` + `TooltipProvider` | ה-Provider יושב ב-[[layout-shell]] |
| `tabs.tsx` | `Tabs` + `tabsListVariants` | — |
| `avatar.tsx` | `Avatar`, `AvatarFallback` | תפריט המשתמש |
| `scroll-area.tsx` | `ScrollArea`, `ScrollBar` | רשימות ארוכות |
| `separator.tsx` | קו מפריד | — |
| `skeleton.tsx` | שלד טעינה | בסיס `LoadingState` |
| `switch.tsx` | מתג | — |

### קבצים נלווים

| קובץ | מה הוא עושה |
|---|---|
| `src/app/globals.css` | מערכת העיצוב בשלוש שכבות: פרימיטיבי מותג → טוקנים סמנטיים → רישום ב-Tailwind. ראה [[design-system]] |
| `src/lib/utils.ts` | `cn()` — מיזוג מחלקות. מיובא בכל קובץ כאן. ראה [[utils]] |
| `components.json` | תצורת ה-CLI. ראה [[build-tooling]] |

## Open Questions
- `switch.tsx` ו-`tabs.tsx` הותקנו אך לא נמצא להם צרכן בקוד הפיצ'רים — ייתכן שהם מיותרים.
- אין תיעוד של אילו רכיבים הותאמו ידנית מעבר ל-`button.tsx`, מה שמקשה לדעת מה בטוח לדרוס.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד 20 פרימיטיבי ה-UI, המחסנית (base-ui + shadcn base-nova + RTL), והאזהרה לגבי `--overwrite`.
- **Decisions:** תועד כמודול אחד ולא לפי רכיב — אלה קוד ספרייה, ומה שמעניין הוא המחסנית והסיכון בדריסה, לא ה-API של כל רכיב.
- **Notes / Caveats:** אזהרת ה-`--overwrite` מבוססת על תקלה שקרתה בפועל בפרויקט הזה.
- **Related:** [[components-common]], [[layout-shell]], [[build-tooling]], [[utils]], [[constants]]
