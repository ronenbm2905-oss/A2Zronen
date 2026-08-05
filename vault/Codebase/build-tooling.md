# Build & Tooling

## Overview

תצורת הבנייה, ה-linting וה-runtime של הפרויקט. הפרויקט רץ על **Next.js 16.3 עם Turbopack**, TypeScript strict, Tailwind v4 דרך PostCSS, ו-ESLint 9 flat config.

שתי נקודות שאינן ברירת מחדל:

- **`serverExternalPackages: ["firebase-admin"]`** ב-`next.config.ts`. ה-SDK מושך gRPC ותלויות native/CJS; השארתו חיצוני גורמת ל-Turbopack לעשות `require()` בזמן ריצה מ-`node_modules` במקום לנסות לארוז אותו. זו אחת משלוש ההגנות על גבול השרת (יחד עם `import "server-only"` ו-zone של `no-restricted-imports` ב-ESLint) — ראה [[services-server]].
- **`src/proxy.ts` ולא `middleware.ts`.** ב-Next.js 16 קונבנציית הקובץ `middleware` הוצאה משימוש ושמה שונה ל-`proxy` — אותה יכולת, שם עדכני.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `package.json` | תלויות וסקריפטים: `dev`, `build`, `start`, `lint`, `typecheck` (`next typegen && tsc --noEmit`). מאז שלב 4 גם `openai` (v7) | שורש הפרויקט |
| `next.config.ts` | מגדיר `serverExternalPackages` ל-`firebase-admin`. `openai` **לא** נוסף שם — הוא JS טהור ומצטרף ל-bundle של השרת בלי בעיה, בשונה מ-gRPC של Admin SDK | בנייה — משפיע על [[firebase-integration]] |
| `src/proxy.ts` | שכבת יירוט הבקשות. מחתימה `x-request-id` (או מכבדת קיים מלמעלה) ומחזירה אותו בתגובה. `matcher` מחריג `_next/static`, `_next/image`, favicon, sitemap, robots. **מעבר בלבד** — אין בו אימות, הפניות או rewrites | runtime — מזין את מזהה המתאם ל-[[api-layer]] |
| `tsconfig.json` | TypeScript strict + alias `@/*` → `src/*` | בנייה |
| `next-env.d.ts` | הצהרות טיפוסים שנוצרות אוטומטית ע"י Next — לא לערוך | בנייה (נוצר) |
| `eslint.config.mjs` | flat config מעל `eslint-config-next`, כולל zone של `no-restricted-imports` שחוסם ייבוא מקוד לקוח של `@/services/server`, `@/config/server-env`, `@/lib/firebase/admin`, `@/lib/auth`, ומאז שלב 4 גם `@/lib/ai`, `@/lib/telegram`, `@/lib/crypto/*` ו-`@/lib/rate-limit` | איכות — אוכף את הגבול של [[services-server]], [[ai-agent]], [[telegram-integration]] |
| `postcss.config.mjs` | טוען את `@tailwindcss/postcss` | סגנון — ראה [[ui-primitives]] |
| `components.json` | תצורת shadcn: style `base-nova`, `rsc: true`, `rtl: true`, baseColor neutral, CSS variables, אייקוני lucide, alias לתיקיות | UI — נצרך ע"י ה-CLI של shadcn |
| `.claude/launch.json` | הגדרת שרת הפיתוח לתצוגה מקדימה בתוך Claude Code | סביבת פיתוח |
| `README.md` | עדיין ה-boilerplate של `create-next-app` — **לא** מתאר את המערכת הזו | תיעוד (מיושן) |
| `AGENTS.md` / `CLAUDE.md` | הנחיות לסוכני AI. `AGENTS.md` נכתב מחדש אוטומטית ע"י `next dev` | תיעוד |

## Open Questions
- `README.md` דורש כתיבה מחדש — הוא מפנה ל-`app/page.tsx` ולפונט Geist, ששניהם לא רלוונטיים כאן.
- אין test runner ואין סקריפט `test` ב-`package.json`.
- אין סקריפט npm לפריסת Firebase; `firebase deploy` מורץ ידנית דרך `npx firebase-tools`.
- אין CI — לא מוגדר workflow שמריץ `lint` או `typecheck`.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד תצורת הבנייה, שכבת ה-proxy, ושתי החריגות מברירת המחדל של Next 16.
- **Decisions:** `proxy.ts` תועד כאן ולא ב-[[app-routing]] — הוא תשתית runtime חוצת-נתיבים, לא נתיב.
- **Notes / Caveats:** גרסת Next (16.3) שונה מהותית מגרסאות קודמות; יש לקרוא `node_modules/next/dist/docs/` לפני שינויי API.
- **Related:** [[config-env]], [[services-server]], [[api-layer]], [[ui-primitives]]
