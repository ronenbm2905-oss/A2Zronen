import { Settings2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CLIENT_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const SERVER_KEYS = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

/**
 * Shown instead of an app screen when `.env.local` has no Firebase credentials.
 *
 * `AuthGate` renders this rather than redirecting to `/login`: with no Firebase
 * config the login screen cannot work either, so a redirect would just bounce
 * the user between two broken pages. Naming the missing variables turns a blank
 * screen into a two-minute fix.
 */
export function FirebaseNotConfigured() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-block">
      <Card>
        <CardHeader>
          <span className="flex size-10 items-center justify-center rounded-full bg-warning-subtle text-warning">
            <Settings2 className="size-5" aria-hidden />
          </span>
          <CardTitle>החיבור ל-Firebase אינו מוגדר</CardTitle>
          <CardDescription>
            כדי להשתמש במערכת יש ליצור פרויקט Firebase ולמלא את משתני הסביבה בקובץ{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs" dir="ltr">
              .env.local
            </code>
            . לאחר מכן יש להפעיל מחדש את שרת הפיתוח.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 text-sm">
          <section className="space-y-2">
            <h2 className="font-heading text-sm">
              הגדרות הדפדפן — מתוך Project settings ← General ← Your apps
            </h2>
            <ul className="space-y-1" dir="ltr">
              {CLIENT_KEYS.map((key) => (
                <li
                  key={key}
                  className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
                >
                  {key}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-sm">
              הגדרות השרת — מתוך Project settings ← Service accounts ← Generate
              new private key
            </h2>
            <ul className="space-y-1" dir="ltr">
              {SERVER_KEYS.map((key) => (
                <li
                  key={key}
                  className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
                >
                  {key}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              יש לשמור את המפתח הפרטי במרכאות כפולות ולהשאיר בו את תווי{" "}
              <code dir="ltr">\n</code> כפי שהם.
            </p>
          </section>

          <p className="text-xs text-muted-foreground">
            אפשר לבדוק את מצב ההגדרה בכל רגע בכתובת{" "}
            <code dir="ltr">/api/health</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
