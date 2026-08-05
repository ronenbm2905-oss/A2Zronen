# Vault Bootstrap

## Overview

הקמת ה-vault של הפרויקט כזיכרון ארוך-טווח ל-Claude Code, יחד עם התקנת שלושת סקילי Obsidian מ-`ZeremItay/the-5-agents-obsidian`.

ה-vault מאורגן **קובץ אחד לכל נושא**: כל קובץ מכיל Overview קבוע (מה הנושא), Open Questions (מה עוד לא סגור), ו-Session Log של סיכומים מתוארכים. הפרוטוקול המלא — מה לקרוא לפני משימה ומה לכתוב אחריה — מוגדר בסקיל `obsidian-vault-workflow` תחת `.claude/skills/`.

### מבנה התיקיות

| תיקייה | תוכן | מצב |
|---|---|---|
| `vault/Codebase/` | תיעוד מבני של הקוד — קובץ לכל מודול | 28 קבצים |
| `vault/Meeting Notes/` | יומני סשנים: קוד, ארכיטקטורה, החלטות | הקובץ הזה |
| `vault/Brand Guidelines/` | מותג, ויזואליה, טון | [[design-system]] |
| `vault/Content Briefs/` | תדריכים עריכתיים | לא נוצרה — תיווצר בשימוש ראשון |
| `vault/Publishing Log/` | הרצות פרסום ותחקירים | לא נוצרה — תיווצר בשימוש ראשון |

`Content Briefs` ו-`Publishing Log` הן קונבנציה מהסקיל שמקורו בפרויקט אחר (AI Content OS) ואינן רלוונטיות למנהל משימות. הסקיל ממילא מורה ליצור תיקייה רק בשימוש ראשון, ולכן הן נשארו לא-קיימות במקום להיווצר ריקות.

### הסקילים שהותקנו

| סקיל | תפקיד |
|---|---|
| `obsidian-vault-workflow` | פרוטוקול הקריאה/כתיבה של ה-vault — הפרוטוקול של הקובץ הזה |
| `obsidian-markdown` | תחביר Obsidian: wikilinks, embeds, callouts, properties |
| `obsidian-bases` | קבצי `.base` — views, filters, formulas |

## Open Questions
- `obsidian-markdown` מפנה ל-`references/PROPERTIES.md`, `EMBEDS.md` ו-`CALLOUTS.md` שאינם קיימים בריפו המקור — ההפניות שבורות. שווה לכתוב אותם או להסיר את ההפניות.
- לא הוחלט אם ה-vault נכנס ל-git או נשאר מקומי; כרגע הוא לא ב-`.gitignore` ולכן ייכנס לקומיט הבא.
- התיעוד ב-`Codebase/` נגזר מקריאת מקור בלבד — לא הורצה בנייה ולא נבדק שהמערכת עולה, ולכן ה-Open Questions בקבצים שם הם השערות מבוססות-קוד ולא ממצאים מאומתים.

## Session Log

### 2026-08-05 — הקמת vault ומיפוי הקוד [shipped]
- **What was done:** הותקנו שלושה סקילי Obsidian ל-`.claude/skills/`; נוצר `vault/` עם שלוש תיקיות ו-31 קבצי MD; מופו כל 188 קבצי המקור ל-28 קבצי תיעוד מודולריים, כל אחד עם טבלת קבצים, שיוך שכבתי ו-wikilinks; נוסף כלל קבוע ל-`CLAUDE.md` שמפעיל את הפרוטוקול בכל סשן.
- **Decisions:** תיעוד ברמת **מודול** ולא קובץ-לקובץ — 190 קבצים קצרצרים היו בלתי ניתנים לתחזוקה, וקונבנציית "one file per topic" של הסקיל מכוונת לכיוון ההפוך. הכיסוי לכל קובץ נשמר דרך טבלת ה-Files בכל מודול. בנוסף: שדה ה-`name` בסקיל `obsidian-vault-workflow` תוקן מ-`"Obsidian Vault Workflow"` ל-kebab-case, כי Claude Code דורש זאת.
- **Notes / Caveats:** הסקילים נטענים בעליית סשן, ולכן בסשן הזה הפרוטוקול בוצע ידנית מתוך קריאת ה-SKILL.md. מהסשן הבא הוא ייטען כרגיל.
- **Related:** [[project-overview]], [[design-system]], [[build-tooling]]
