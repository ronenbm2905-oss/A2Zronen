import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/common";
import { TasksView } from "@/components/tasks/tasks-view";

export const metadata: Metadata = {
  title: "כל המשימות",
  description: "צפייה, סינון ומיון של כל המשימות שלך.",
};

/**
 * `TasksView` reads the filter state from the URL via `useSearchParams`, which
 * Next requires to sit inside a suspense boundary — without it the production
 * build fails during the prerender pass.
 */
export default function TasksPage() {
  return (
    <Suspense fallback={<LoadingState variant="list" count={5} />}>
      <TasksView />
    </Suspense>
  );
}
