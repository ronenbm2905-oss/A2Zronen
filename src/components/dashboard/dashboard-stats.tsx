"use client";

import { AlertTriangle, CalendarDays, CheckCircle2, ListTodo } from "lucide-react";

import { StatCard } from "@/components/common";
import type { DashboardStats } from "@/hooks";

/**
 * The four headline figures.
 *
 * Each links to the tasks screen with the matching filter already applied, so a
 * number is never a dead end — seeing "4 באיחור" and being one click from the
 * list of them is the whole point of the counter.
 */
export function DashboardStatsRow({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="משימות פתוחות"
        value={stats.open}
        icon={ListTodo}
        tone="info"
        href="/tasks?status=todo,in_progress"
      />
      <StatCard
        label="הושלמו"
        value={stats.completed}
        icon={CheckCircle2}
        tone="success"
        hint={`${stats.completionRate}% מכלל המשימות`}
        href="/tasks?status=done"
      />
      <StatCard
        label="להיום"
        value={stats.dueToday}
        icon={CalendarDays}
        tone="warning"
        href="/tasks?due=today"
      />
      <StatCard
        label="באיחור"
        value={stats.overdue}
        icon={AlertTriangle}
        tone="destructive"
        href="/tasks?due=overdue"
      />
    </div>
  );
}
