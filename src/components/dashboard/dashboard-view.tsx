"use client";

import { ListTodo } from "lucide-react";
import { useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { useAuth, useDashboardStats } from "@/hooks";
import type { Task } from "@/types";

import { DashboardBreakdowns } from "./dashboard-breakdowns";
import { DashboardLists } from "./dashboard-lists";
import { DashboardStatsRow } from "./dashboard-stats";
import { QuickActions } from "./quick-actions";

/**
 * The dashboard.
 *
 * Every figure on this screen is derived from the same live task subscription,
 * so counters, breakdowns and lists update together the instant anything
 * changes — including from another tab or device — with no refetch and no
 * polling. That consistency is the payoff of deriving everything from one array
 * rather than issuing a query per panel.
 */
export function DashboardView() {
  const { user } = useAuth();
  const { stats, isLoading, isError, error, isEmpty } = useDashboardStats();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const firstName = user?.displayName?.trim().split(/\s+/)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `שלום, ${firstName}` : "לוח בקרה"}
        description="תמונת מצב של המשימות שלך."
      />

      {isError ? <ErrorState error={error} /> : null}

      {isLoading ? (
        <>
          <LoadingState variant="stats" count={4} />
          <LoadingState variant="list" count={3} />
        </>
      ) : null}

      {!isLoading && !isError ? (
        <>
          <QuickActions onCreateTask={() => setIsCreateOpen(true)} />

          {isEmpty ? (
            <EmptyState
              icon={ListTodo}
              title="אין עדיין משימות"
              description="צור את המשימה הראשונה שלך כדי להתחיל לעקוב אחרי מה שצריך לעשות."
              action={
                <Button variant="strong" onClick={() => setIsCreateOpen(true)}>
                  יצירת משימה ראשונה
                </Button>
              }
            />
          ) : (
            <>
              <DashboardStatsRow stats={stats} />
              <DashboardBreakdowns stats={stats} />
              <DashboardLists
                stats={stats}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            </>
          )}
        </>
      ) : null}

      <TaskFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      <TaskFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        task={editing ?? undefined}
      />

      <DeleteTaskDialog task={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
