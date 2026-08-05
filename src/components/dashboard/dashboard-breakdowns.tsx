"use client";

import { BreakdownBar, type BreakdownSegment } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
} from "@/constants";
import type { DashboardStats } from "@/hooks";

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-chart-2",
  in_progress: "bg-chart-1",
  done: "bg-chart-5",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-chart-1",
  high: "bg-chart-4",
  urgent: "bg-chart-3",
};

/**
 * Status and priority distributions.
 *
 * Status covers all tasks — it is a picture of the whole workload, including
 * what is finished. Priority covers open tasks only, because a priority chart
 * dominated by completed urgent work says nothing about what needs attention now.
 */
export function DashboardBreakdowns({ stats }: { stats: DashboardStats }) {
  const statusSegments: BreakdownSegment[] = TASK_STATUSES.map((status) => ({
    key: status,
    label: TASK_STATUS_LABELS[status],
    value: stats.byStatus[status],
    className: STATUS_COLORS[status],
  }));

  const prioritySegments: BreakdownSegment[] = TASK_PRIORITIES.map((priority) => ({
    key: priority,
    label: TASK_PRIORITY_LABELS[priority],
    value: stats.byPriority[priority],
    className: PRIORITY_COLORS[priority],
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>משימות לפי סטטוס</CardTitle>
        </CardHeader>
        <CardContent>
          <BreakdownBar segments={statusSegments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>משימות פתוחות לפי עדיפות</CardTitle>
        </CardHeader>
        <CardContent>
          <BreakdownBar
            segments={prioritySegments}
            emptyLabel="אין משימות פתוחות"
          />
        </CardContent>
      </Card>
    </div>
  );
}
