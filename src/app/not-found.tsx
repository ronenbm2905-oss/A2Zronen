import { Compass } from "lucide-react";

import { ButtonLink } from "@/components/common";

/** 404 boundary. */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-7" aria-hidden />
      </span>

      <div className="space-y-1">
        <h1 className="text-display-sm">404</h1>
        <p className="text-muted-foreground">
          הדף שחיפשת לא קיים, או שהקישור השתנה.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <ButtonLink variant="strong" href="/dashboard">
          ללוח הבקרה
        </ButtonLink>
        <ButtonLink variant="outline" href="/">
          לדף הבית
        </ButtonLink>
      </div>
    </main>
  );
}
