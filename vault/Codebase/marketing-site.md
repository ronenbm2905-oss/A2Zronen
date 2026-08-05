# Marketing Site

## Overview

דף הנחיתה הציבורי ב-`/`. קבוצת הניתוב `(marketing)` היא היחידה ללא שער גישה — כל אחד יכול להגיע אליה, מחובר או לא.

הקומפוננטות שמכילות קריאה לפעולה (`Hero`, `CtaBand`, `MarketingHeader`) הן `"use client"` **רק** כדי לקרוא ל-`useAuth()` — הן מחליפות בין "התחל עכשיו" ל"ללוח הבקרה" לפי מצב ההתחברות. `FeatureGrid`, `HowItWorks` ו-`MarketingFooter` נשארים Server Components.

התוכן והטקסטים כתובים inline בתוך הקומפוננטות (מערכי `const` בראש הקובץ) — אין CMS ואין קובץ תוכן נפרד.

## Files

| קובץ | מה הוא עושה | שכבה |
|---|---|---|
| `src/app/(marketing)/layout.tsx` | header + footer סביב התוכן | [[app-routing]] |
| `src/app/(marketing)/page.tsx` | מרכיב: `Hero` → `FeatureGrid` → `HowItWorks` → `CtaBand` | [[app-routing]] |
| `src/components/marketing/marketing-header.tsx` | לוגו + קישורי כניסה/לוח בקרה לפי מצב האימות (client) | UI — [[auth]] |
| `src/components/marketing/hero.tsx` | כותרת ראשית וקריאה לפעולה מותנית-אימות (client) | UI |
| `src/components/marketing/feature-grid.tsx` | רשת יכולות עם אייקוני lucide; מערך `const` בראש הקובץ (server) | UI |
| `src/components/marketing/how-it-works.tsx` | שלבי השימוש (server) | UI |
| `src/components/marketing/cta-band.tsx` | רצועת קריאה לפעולה תחתונה (client) | UI — [[auth]] |
| `src/components/marketing/marketing-footer.tsx` | קישורי תחתית (server) | UI |

## Open Questions
- אין `metadata` ייעודי ל-`(marketing)/page.tsx` — הדף יורש את ה-metadata של ה-root layout, מה שלא אידיאלי ל-SEO של דף נחיתה.
- אין קישורי משפט/פרטיות אמיתיים ב-footer.
- אין תיקיית `marketing/index.ts` (barrel) בשונה משאר תיקיות הקומפוננטות — הייבוא נעשה בנתיב מלא.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד שמונת קבצי דף הנחיתה וההפרדה בין רכיבי שרת לרכיבי לקוח.
- **Decisions:** הודגש ש-`"use client"` כאן נובע **רק** מ-`useAuth` — כדי שלא יומר בטעות לרינדור סטטי בלי לטפל בקריאה לפעולה המותנית.
- **Notes / Caveats:** זהו האזור היחיד באפליקציה ללא שער גישה; שינוי ב-`(marketing)/layout.tsx` משפיע על מה שרואים משתמשים אנונימיים.
- **Related:** [[app-routing]], [[auth]], [[ui-primitives]], [[design-system]]
