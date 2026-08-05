"use client";

import { useState, type ReactNode } from "react";

import { TaskFormDialog } from "@/components/tasks/task-form-dialog";

import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

/**
 * Chrome for every signed-in screen.
 *
 * The sidebar sits first in a flex row, so under `dir="rtl"` it lands against
 * the right edge without a single physical `left`/`right` — change the document
 * direction and the layout follows.
 *
 * "New task" lives here rather than on each page so the action is reachable from
 * anywhere in the app, including the dashboard and the tags screen where a task
 * list is not on screen.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-s border-sidebar-border bg-sidebar p-4 lg:block">
        <AppSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onCreateTask={() => setIsCreateOpen(true)} />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <TaskFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
