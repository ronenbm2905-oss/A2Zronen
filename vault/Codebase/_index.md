# Codebase — Index

תיעוד מבני של קוד המקור: קובץ אחד לכל מודול, המכסה את כל הקבצים שבתחומו — מה כל קובץ עושה, למי הוא שייך, ומה קשור אליו.

## Topics

### תמונה כללית
- [[project-overview]] — ארכיטקטורה, זרימת נתונים, מפת שכבות ומוסכמות חוצות-קוד

### תשתית ותצורה
- [[config-env]] — `src/config`: משתני סביבה, קבועי אפליקציה, גייטים של Firebase
- [[build-tooling]] — package.json, tsconfig, eslint, postcss, next.config, proxy
- [[firebase-integration]] — Web SDK, Admin SDK, converters, firestore.rules ואינדקסים

### חוזים
- [[types-domain]] — `src/types`: הטיפוסים של הדומיין ומעטפת ה-API
- [[schemas-validation]] — `src/lib/schemas`: סכמות Zod לקלט
- [[constants]] — `src/constants`: תוויות עברית, מגבלות, ניווט, מפות צבע
- [[errors-handling]] — `AppError`, קודי שגיאה, הודעות עברית, logger

### שכבת שרת
- [[api-routes]] — `src/app/api`: כל ה-endpoints
- [[api-layer]] — `src/lib/api`: `withApiHandler`, envelope, ולידציית קלט
- [[auth]] — `requireUser`, AuthProvider, מסכי ושערי התחברות
- [[services-server]] — `src/services/server`: לוגיקה עסקית ו-persistence

### שכבת לקוח
- [[services-client]] — `src/services/client`: מנויי onSnapshot ומיפוי מסמכים
- [[data-fetching-query]] — `src/lib/query` + `useRealtimeCollection`: הגשר realtime↔React Query
- [[api-client]] — `src/lib/api-client`: `apiFetch` ומפת ה-endpoints
- [[hooks]] — `src/hooks`: כל ה-hooks והחלוקה ביניהם
- [[toasts-notifications]] — חנות ה-toast, ה-hook וה-renderer
- [[utils]] — `src/utils` + `lib/utils`: עוזרים טהורים

### ממשק משתמש
- [[ui-primitives]] — `src/components/ui`: פרימיטיבים של shadcn/base-ui
- [[components-common]] — `src/components/common`: אבני בניין חוצות-פיצ'ר
- [[layout-shell]] — shell, sidebar, topbar, providers
- [[app-routing]] — `src/app`: route groups, layouts, error/loading boundaries

### פיצ'רים
- [[tasks-feature]] — משימות: תצוגות, טפסים, פילטרים, מוטציות
- [[projects-feature]] — פרויקטים
- [[tags-feature]] — תגיות
- [[dashboard-feature]] — לוח בקרה וסטטיסטיקות
- [[settings-feature]] — פרופיל, סיסמה, פעולות חשבון, חיבורים
- [[marketing-site]] — דף הנחיתה הציבורי

### אינטגרציות
- [[telegram-integration]] — בוט לכל משתמש: טוקן מוצפן, webhook, קישור צ׳אט
- [[ai-agent]] — `src/lib/ai`: OpenAI, כלים, זרימת האישור, טביעת ID token
