# Common Components

## Overview

`src/components/common` הוא השכבה שבין פרימיטיבי [[ui-primitives]] לקומפוננטות של הפיצ'רים: אבני בניין שיש להן דעה על הדומיין הזה, אבל לא שייכות לפיצ'ר יחיד.

ההבחנה מול `ui/`: רכיב ב-`ui/` הוא גנרי וניתן להעתקה לכל פרויקט; רכיב כאן מכיר את `ColorToken`, את `AppError`, או את מוסכמות ה-RTL של המוצר.

שלוש המצבים (`LoadingState`, `ErrorState`, `EmptyState`) הם מה שמאפשר לכל מסך להיראות עקבי — וזו הסיבה שהגשר ב-[[data-fetching-query]] טרח לגרום ל-realtime להתנהג כמו שאילתה רגילה.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `loading-state.tsx` | שלד טעינה מבוסס `Card` + `Skeleton`. משמש גם כתוכן `loading.tsx` בכל נתיב | [[app-routing]] |
| `error-state.tsx` | מצב שגיאה עם ניסיון חוזר. מתרגם דרך `toHebrewMessage` ומציג פירוט טכני רק כשה-`appEnv` אינו production | [[errors-handling]], [[config-env]] |
| `empty-state.tsx` | מצב ריק עם אייקון, כותרת, תיאור ופעולה | כל מסכי הרשימות |
| `firebase-not-configured.tsx` | מסך הנחיה כשמשתני Firebase חסרים — מוצג ע"י `AuthGate` | [[auth]], [[config-env]] |
| `page-header.tsx` | כותרת מסך אחידה (כותרת, תיאור, פעולות) | כל מסכי `(app)` |
| `stat-card.tsx` | כרטיס מדד; אופציונלית עטוף ב-`Link` | [[dashboard-feature]] |
| `breakdown-bar.tsx` | פס פילוח מקטעים + הטיפוס `BreakdownSegment` | [[dashboard-feature]] |
| `form-field.tsx` | שדה טופס: תווית, שגיאה, עזרה, `useId` לקישור נגישות | כל הטפסים |
| `select-field.tsx` | `SelectField` + `SelectOption` — עוטף את `Select` בחוזה של `FormField` | טפסים ומסננים |
| `submit-button.tsx` | כפתור שליחה עם ספינר ונעילה בזמן שליחה | כל הטפסים |
| `color-picker.tsx` | בורר מתוך `COLOR_TOKENS` עם סימון הנבחר | [[tags-feature]], [[projects-feature]] |
| `color-dot.tsx` | נקודת צבע לפי `ColorToken` דרך `COLOR_DOT_CLASSES` | [[constants]] |
| `confirm-dialog.tsx` | דיאלוג אישור מעל `AlertDialog`, עם מצב טעינה | משתמש ב-`useConfirm` מ-[[hooks]] |
| `button-link.tsx` | `Link` של Next בעיצוב כפתור, דרך `buttonVariants` | ניווט |
| `toaster.tsx` | ה-renderer של ההודעות הצפות | [[toasts-notifications]] |
| `index.ts` | barrel | גבול מודול |

### נקודה שכדאי לדעת

`ButtonLink` קיים כי עטיפת `<Link>` ב-`<Button>` מייצרת `<a>` בתוך `<button>` — HTML לא חוקי. הוא מיישם את `buttonVariants` ישירות על ה-`Link`.

## Open Questions
- `ErrorState` חושף פירוט טכני לפי `env.appEnv`; יש לוודא ש-`NEXT_PUBLIC_APP_ENV` אכן מוגדר ל-`production` בפריסה, אחרת פנימיות יגיעו למשתמשים.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד 16 הקומפוננטות המשותפות וההבחנה בינן לבין [[ui-primitives]].
- **Decisions:** `toaster.tsx` נשאר בטבלה כאן (זה מיקומו בפועל) אך מתועד לעומק ב-[[toasts-notifications]] יחד עם החנות וה-hook שלו.
- **Notes / Caveats:** ההבחנה ui/ מול common/ אינה נאכפת ע"י כלום — רק ע"י שיפוט. רכיב שמייבא מ-`@/types` או `@/constants` שייך כאן, לא ב-`ui/`.
- **Related:** [[ui-primitives]], [[hooks]], [[errors-handling]], [[dashboard-feature]], [[app-routing]]
