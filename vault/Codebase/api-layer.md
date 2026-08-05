# API Layer

## Overview

`src/lib/api` הוא התשתית שמתחת לכל נתיב API. שלושה קבצים, וכולם קיימים כדי שכל handler ב-[[api-routes]] יוכל להיות שלוש שורות.

`withApiHandler` הוא נקודת הכניסה היחידה, והוא מבטיח שלושה דברים על פני כל שטח ה-API:

1. תגובות תמיד משתמשות במעטפת `ApiResponse` — לעולם לא payload חשוף.
2. `AppError` שנזרק ממופה לסטטוס ה-HTTP המוצהר שלו.
3. כל דבר אחר הופך ל-500 גנרי מלוגג — פרטים פנימיים לא מגיעים ללקוח.

ה-handler מקבל את ה-*payload* כערך החזרה, לא `Response`. מי שצריך לבנות תגובה בעצמו (streaming, redirect) עדיין יכול להחזיר `NextResponse` ישירות, ו-`withApiHandler` יעביר אותו כמות שהוא.

`x-request-id` שנוצר ב-proxy ([[build-tooling]]) נקרא כאן ומוחזר על התגובה ועל שורות הלוג — כך שאפשר לעקוב אחרי בקשה מהקצה ועד ה-service.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/lib/api/handler.ts` | `withApiHandler<TContext>(handler)` — עטיפה שמייצרת את המעטפת, ממפה שגיאות ומלוגגת. מבחינה בין שגיאה תפעולית (`logger.warn`) לכשל אמיתי (`logger.error`). מייצא גם את הטיפוס `ApiHandler` | ליבת ה-API — נצרך ע"י **כל** נתיב ב-[[api-routes]] |
| `src/lib/api/response.ts` | `apiSuccess<T>(data, opts)` ו-`apiFailure(error, opts)` — בונים את ה-`NextResponse` עם הסטטוס והכותרות הנכונים | ליבת ה-API |
| `src/lib/api/validate.ts` | `parseJsonBody(request, schema)` ו-`parseSearchParams(request, schema)` — מפרסרים ומאמתים מול סכמת Zod, וזורקים `AppError.validation` עם בעיות פר-שדה ב-`details` | ולידציה — משתמש ב-[[schemas-validation]] |
| `src/lib/api/index.ts` | barrel: `withApiHandler`, `apiSuccess`, `apiFailure`, `parseJsonBody`, `parseSearchParams` | גבול מודול |

### התבנית שכל נתיב עוקב אחריה

```ts
export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await requireUser(request);              // ← auth
  const input = await parseJsonBody(request, schema);   // ← ולידציה
  return createTask(user.uid, input);                   // ← service
});
```

הסדר אינו שרירותי: אימות קודם לולידציה, כדי שבקשה לא מאומתת לא תקבל מידע על צורת ה-payload.

## Open Questions
- אין הגבלת קצב ב-`withApiHandler`, אף ש-`RATE_LIMITED` קיים ב-[[errors-handling]].
- `parseSearchParams` בשימוש רק ב-`GET /api/v1/tasks`; שאר endpoints של רשימה לא מקבלים מסננים.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד שלושת קבצי התשתית, שלוש ההבטחות של `withApiHandler`, והתבנית הקבועה של נתיב.
- **Decisions:** התבנית תועדה במפורש כולל **סדר** השלבים — אימות לפני ולידציה הוא החלטת אבטחה, לא סגנון.
- **Notes / Caveats:** ה-handler מחזיר payload ולא `Response`; מי שיחזיר `NextResponse` יעקוף את המעטפת בשקט.
- **Related:** [[api-routes]], [[auth]], [[schemas-validation]], [[errors-handling]], [[types-domain]]
