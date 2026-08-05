# Utils

## Overview

`src/utils` הוא עוזרים **טהורים**. הגבול מול `@/lib` מוגדר במפורש בקוד: כל מה שכאן חייב להיות חסר-מצב ואסור לו לגעת ברשת, בסביבה או ב-SDK כלשהו. תשתית חיה ב-`@/lib`.

`src/lib/utils.ts` הוא חריג יחיד ומכוון — הוא מכיל רק את `cn()` ויושב שם כי זה הנתיב ש-shadcn מצפה לו (`components.json` → `aliases.utils`).

### שתי המוסכמות של `date.ts`

1. **תאריך יעד הוא רגע, אבל משמעותו יום.** `<input type="date">` נותן `"2026-08-05"`; אנחנו שומרים את הרגע של חצות **מקומית** בתחילת אותו יום, כך ש"היום" ו"באיחור" מושווים נכון עבור מי שמסתכל על המסך. ההנחה היא שמשתמש נשאר באזור זמן אחד — נכון למוצר הזה, והחלופה (שמירת מחרוזת `YYYY-MM-DD`) הייתה מוותרת על שאילתות טווח נייטיב ב-Firestore.
2. **אף פעם לא לפרמט תאריך ב-Server Component.** `Intl` פותר מול אזור הזמן של השרת, כך ש-HTML מהשרת והרינדור מחדש בלקוח לא מסכימים ו-React מדווח על hydration mismatch. **כל** קורא של `formatDateHe` ו-`formatRelativeHe` חייב להיות בתוך client component.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/utils/date.ts` | `startOfDay`, `addDays`, `parseDate`, `fromDateInputValue`, `toDateInputValue`, `isToday`, `isPastDue`, `isUpcoming`, `daysUntil`, `formatDateHe`, `formatDateTimeHe`, `formatRelativeHe` | נצרך ע"י [[tasks-feature]], [[dashboard-feature]], [[hooks]] |
| `src/utils/array.ts` | `countBy` (בסיס כל פילוח בלוח הבקרה), `groupBy`, `indexById` (ה-join של `useLookups`), `unique`, `sameMembers` | נצרך ע"י [[hooks]], [[services-server]] |
| `src/utils/format.ts` | `toIsoString(value)` — נרמול לפורמט התיל של ה-API; `isBlank(value)` | נצרך ע"י [[api-routes]], טפסים |
| `src/utils/index.ts` | barrel לשלושת הקבצים | גבול מודול |
| `src/lib/utils.ts` | `cn(...inputs)` — `clsx` + `tailwind-merge`. הנתיב ש-shadcn מצפה לו | נצרך ע"י **כל** קומפוננטה ב-[[ui-primitives]] |

### פרטים שקל לפספס

- **`sameMembers`** קיים כדי להשוות `tagIds` בלי תלות בסדר — בשימוש בעדכונים אופטימיים.
- **`parseDate` מחזיר `null`** לקלט ריק, כך שאפשר להעביר שדה אופציונלי ישירות.
- **`fromDateInputValue` / `toDateInputValue`** הן זו ההופכית של זו, ומהוות את הגבול היחיד בין `<input type="date">` ל-`ISODateString`.

## Open Questions
- ההנחה של אזור זמן יחיד תישבר אם המוצר יתמוך במשתמשים שנוסעים בין אזורים — כרגע זו החלטה מודעת ולא באג.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד חמשת קבצי העוזרים, גבול `@/utils` מול `@/lib`, ושתי מוסכמות התאריכים.
- **Decisions:** `src/lib/utils.ts` תועד כאן ולא ב-[[ui-primitives]] — הוא עוזר, גם אם מיקומו מוכתב ע"י shadcn.
- **Notes / Caveats:** כלל "אין פורמט תאריך בשרת" אינו נאכף ע"י שום דבר בקוד — הפרתו מייצרת hydration mismatch שקשה לאבחן.
- **Related:** [[types-domain]], [[hooks]], [[tasks-feature]], [[ui-primitives]]
