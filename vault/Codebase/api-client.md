# API Client

## Overview

`src/lib/api-client` הוא צד הלקוח של החוזה מול [[api-routes]]. שני קבצים בלבד, ותפקידם למנוע משני דברים להתפזר בקוד: **בניית ה-URL** ו-**צירוף הטוקן**.

`apiFetch` מקבל `GetToken` — פונקציה שמחזירה Firebase ID token, עם אפשרות ל-`forceRefresh`. הוא לא ניגש ל-Firebase בעצמו; ה-AuthProvider ב-[[auth]] מזריק אותה דרך ה-hook `useApiFetch`. כך ששכבת ה-fetch נשארת ניתנת לבדיקה ולא קשורה ל-SDK.

בחזרה, `apiFetch` **מפרק את המעטפת**: תגובת `{ success: false, error }` הופכת חזרה ל-`AppError` עם ה-`code` המקורי, כך שקוד קורא יכול להסתעף על קוד שגיאה בדיוק כמו בשרת. ראה [[errors-handling]].

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/lib/api-client/endpoints.ts` | `endpoints` — מפעל נתיבים מרוכז שבונה `/api/v1/...` מ-`appConfig`. מייצא גם את הטיפוס `Endpoints` | חוזה — משקף את [[api-routes]] |
| `src/lib/api-client/fetch.ts` | `apiFetch<T>(url, options)` — מצרף `Authorization: Bearer`, מפרסר את המעטפת, וממיר כשל ל-`AppError`. מייצא את הטיפוסים `ApiFetchOptions` ו-`GetToken` | תשתית — נצרך דרך `useApiFetch` |
| `src/lib/api-client/index.ts` | barrel | גבול מודול |

### נקודות שכדאי לזכור

- **`endpoints` הוא המקום היחיד שבונה נתיבי API בצד הלקוח.** שינוי נתיב = שינוי בשני קבצים בלבד (כאן ותחת `src/app/api`).
- **`GetToken` מקבל `forceRefresh`** כדי שאפשר יהיה לנסות שוב אחרי 401 עם טוקן טרי, במקום להתנתק מיד.
- **אף hook לא קורא ל-`apiFetch` ישירות** — כולם עוברים דרך `useApiFetch()` שכבר יודע להביא את הטוקן של המשתמש הנוכחי.
- **`endpoints` כולל מאז שלב 4 גם את `telegramIntegration` ו-`telegramIntegrationTest`.** נתיב ה-webhook עצמו **אינו** כאן — הוא נקרא ע"י Telegram, לא ע"י הדפדפן.
- **ל-agent יש לקוח משלו**, `createAgentApiClient` ב-[[ai-agent]]. הוא מדבר עם אותם endpoints אבל בשרת, עם טוקן שנטבע מ-uid במקום כזה שנלקח מ-Firebase SDK בדפדפן.

## Open Questions
- לא ברור אם קיים retry אוטומטי על 401 עם `forceRefresh: true`, או שהפרמטר קיים בלי צרכן — שווה בדיקה ב-`use-auth.ts` לפני שמסתמכים עליו.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד שני קבצי לקוח ה-API, הזרקת `GetToken`, ופירוק המעטפת חזרה ל-`AppError`.
- **Decisions:** תועד בנפרד מ-[[api-layer]] — שם צד השרת, כאן צד הלקוח; שניהם מממשים את אותו חוזה משני קצוותיו.
- **Notes / Caveats:** `endpoints` ו-`src/app/api` חייבים להישאר מסונכרנים ידנית — אין דבר שאוכף את זה בזמן קומפילציה.
- **Related:** [[api-routes]], [[auth]], [[hooks]], [[errors-handling]], [[config-env]]
