# Server Services

## Overview

`src/services/server` מחזיק את הלוגיקה העסקית ואת ה-persistence. פונקציות רגילות, ללא ידע ב-HTTP — ה-handlers ב-[[api-routes]] נשארים דקים כי כל מה שמעניין קורה כאן.

**כל פונקציה מקבלת `uid` כארגומנט ראשון, והערך הזה מגיע רק מ-`requireUser()`** — אף פעם לא מגוף בקשה. שלושה כללים נשמרים לאורך כל המודול, והם מה שהופך את בידוד הדיירים למבני ולא מקרי:

1. כל שאילתת רשימה נפתחת ב-`where("userId", "==", uid)`.
2. כל קריאת מסמך בודד בודקת מחדש את `userId` ומדווחת **404 ולא 403** באי-התאמה — כך שה-API לא מאשר שמשימה של משתמש אחר קיימת.
3. `userId` נכתב פעם אחת ביצירה ולא ניתן לספק אותו בעדכון — סכמות העדכון הן `.strict()`, כך ש-payload שנושא אותו הוא 400.

### הגבול מול קוד לקוח

`src/services/index.ts` מייצא מחדש **רק** את `./client`. `./server` נעדר במכוון: הוא נושא את ה-service account, וייצוא שלו משם היה מושך `firebase-admin` לתוך כל bundle שנוגע ב-service כלשהו. שלושה מנגנונים אוכפים את זה מעבר לקונבנציה — `import "server-only"` בראש כל מודול שרת, zone של `no-restricted-imports` ב-ESLint, ו-`serverExternalPackages` ב-`next.config.ts`.

## Files

| קובץ | מה הוא עושה | שייך ל־ |
|---|---|---|
| `src/services/server/refs.ts` | ידיות לקולקציות (`tasksRef()`, `projectsRef()`, `tagsRef()`, `usersRef()`) ומיפוי מסמך → DTO (`toTask`, `toProject`, `toTag`, `toUserProfile`) עבור Admin SDK. הקולקציות top-level עם שדה `userId` — בעלות היא predicate, לא מקטע נתיב | בסיס — נצרך ע"י כל ה-services |
| `src/services/server/task.service.ts` | `getTask`, `listTasks`, `createTask`, `updateTask`, `deleteTask`. מכיל את `assertReferencesOwned` — מוודא שכל `projectId`/`tagIds` שמופנים אליהם קיימים **ושייכים ל-uid**, ומדווח על מפתח זר זר כשגיאת **ולידציה** ולא הרשאה | [[tasks-feature]] |
| `src/services/server/project.service.ts` | `getProject`, `listProjects`, `createProject`, `updateProject`, `deleteProject`. משתמש ב-`FieldValue` לניקוי הפניות במחיקה | [[projects-feature]] |
| `src/services/server/tag.service.ts` | `getTag`, `listTags`, `createTag`, `updateTag`, `deleteTag` | [[tags-feature]] |
| `src/services/server/user.service.ts` | `bootstrapUser` (יצירת מסמך המראה בהתחברות ראשונה), `getProfile`, `updateProfile` | [[auth]], [[settings-feature]] |
| `src/services/server/integration.service.ts` | חיבור/בדיקה/ניתוק של בוט Telegram, `applyWebhook`, קישור צ׳אט, ומצב השיחה (`AgentSession`). היחיד שנוגע בטוקן המוצפן | [[telegram-integration]] |
| `src/services/server/telegram-agent.service.ts` | ניתוב עדכון נכנס: קישור, פקודות, אישור/ביטול, קריאה ל-agent. **לעולם לא זורק** — הוא רץ ב-`after()` | [[telegram-integration]], [[ai-agent]] |
| `src/services/server/index.ts` | barrel לכל ה-services. **לא** מיוצא מ-`@/services` | גבול מודול |
| `src/services/index.ts` | barrel של צד הלקוח בלבד — ראה [[services-client]]. קיים כדי לשמור על הגבול גלוי | גבול מודול |

### פרטים שקל לפספס

- **`completedAt`** נקבע בשרת כשהסטטוס הופך ל-`done` ומתאפס ביציאה — הלקוח לא שולט בו.
- **מפתח זר זר מדווח כ-`VALIDATION_ERROR`** ולא `FORBIDDEN`: מנקודת המבט של הקורא, המזהה הזה פשוט אינו דבר שהוא יכול להפנות אליו, ו"אסור" היה מאשר את קיומו.
- **מחיקת פרויקט/תגית** צריכה לנקות הפניות במשימות — מבוצע דרך `FieldValue` ו/או `WriteBatch`.

## Open Questions
- לא נבדק כאן האם מחיקת תגית מנקה `tagIds` מכל המשימות באצווה אחת או במספר סבבים — רלוונטי אם למשתמש יש הרבה משימות עם אותה תגית.
- אין טרנזקציות סביב create/update של משימה עם הפניות; `assertReferencesOwned` רץ לפני הכתיבה, כך שיש חלון תיאורטי למחיקה מקבילה של הפרויקט.

## Session Log

### 2026-08-05 — תיעוד ראשוני [shipped]
- **What was done:** תיעוד שבעת קבצי שכבת השרת, שלושת כללי בידוד הדיירים, ושלושת המנגנונים שאוכפים את גבול השרת/לקוח.
- **Decisions:** `src/services/index.ts` תועד גם כאן וגם ב-[[services-client]] — הוא הגבול עצמו, ולכן שייך לשני הצדדים.
- **Notes / Caveats:** ה-Admin SDK עוקף את `firestore.rules` לחלוטין, ולכן **כל** אכיפת הבעלות בכתיבה נשענת על הקוד בתיקייה הזו בלבד.
- **Related:** [[api-routes]], [[firebase-integration]], [[types-domain]], [[schemas-validation]], [[services-client]], [[auth]]

### 2026-08-05 — שני services לשלב 4 [shipped]
- **What was done:** נוספו `integration.service.ts` ו-`telegram-agent.service.ts`, ושתי קולקציות ב-`refs.ts` (`integrations`, `agentSessions`) עם `toTelegramIntegration`.
- **Decisions:** ה-agent **לא** קורא לשירותים כאן — הוא יוצא ב-HTTP ל-`/api/v1` ([[ai-agent]]), ולכן הכלל "כל service מקבל `uid` מ-`requireUser`" נשמר בלי חריג. `telegram-agent.service` מפר במכוון את התבנית של שאר התיקייה: הוא אורקסטרציה ולא persistence, אבל הוא שייך לשרת ולשכבה הזו.
- **Notes / Caveats:** תוקן באג בזמן האימות — כשה-origin אינו נגיש, ההתחברות הייתה מסובבת את `webhookSecret` ומשאירה רישום ישן אצל Telegram, כך שהבוט היה "מחובר ואילם". `applyWebhook` מוחק את הרישום במקרה הזה.
- **Related:** [[telegram-integration]], [[ai-agent]], [[firebase-integration]], [[api-routes]]
