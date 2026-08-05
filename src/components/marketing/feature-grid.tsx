import {
  CalendarClock,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Smartphone,
  Tags,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: ListTodo,
    title: "ניהול משימות מלא",
    description:
      "כותרת, תיאור, סטטוס, עדיפות ותאריך יעד — כל מה שצריך כדי לדעת מה הלאה.",
  },
  {
    icon: FolderKanban,
    title: "פרויקטים",
    description:
      "קבץ משימות לפי תחום, וראה בכל רגע כמה עוד נשאר לסגור בכל פרויקט.",
  },
  {
    icon: Tags,
    title: "תגיות",
    description:
      "סמן משימות בכמה חתכים במקביל, וסנן לפיהם בלחיצה אחת.",
  },
  {
    icon: LayoutDashboard,
    title: "לוח בקרה חי",
    description:
      "משימות להיום, משימות באיחור ופילוח לפי סטטוס ועדיפות — מתעדכן בזמן אמת.",
  },
  {
    icon: CalendarClock,
    title: "אף משימה לא נופלת",
    description:
      "מה שבאיחור בולט מיד, ומה שלהיום תמיד נמצא בראש הרשימה.",
  },
  {
    icon: Smartphone,
    title: "מותאם לנייד",
    description:
      "ממשק בעברית מלאה, שעובד באותה מידה במסך גדול ובטלפון.",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-section sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-display-sm sm:text-display-md">
          כל מה שצריך כדי לנהל את היום
        </h2>
        <p className="mt-3 text-muted-foreground">
          בלי תפריטים מיותרים ובלי הגדרות אינסופיות.
        </p>
      </div>

      <ul className="mt-block grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <li key={feature.title}>
            <Card className="h-full">
              <CardHeader>
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary-strong">
                  <feature.icon className="size-5" aria-hidden />
                </span>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm leading-body text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
