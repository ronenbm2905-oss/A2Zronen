"use client";

import { AlertTriangle, CalendarDays, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ButtonLink } from "@/components/common";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TaskCard } from "@/components/tasks/task-card";
import type { DashboardStats } from "@/hooks";
import type { Task } from "@/types";

interface DashboardListsProps {
  stats: DashboardStats;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

/** Due today, overdue, and recently touched. */
export function DashboardLists({ stats, onEdit, onDelete }: DashboardListsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TaskPanel
        title="להיום"
        icon={CalendarDays}
        href="/tasks?due=today"
        tasks={stats.todayTasks}
        emptyLabel="אין משימות שתאריך היעד שלהן היום."
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <TaskPanel
        title="באיחור"
        icon={AlertTriangle}
        href="/tasks?due=overdue"
        tasks={stats.overdueTasks}
        emptyLabel="אין משימות באיחור. יפה!"
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <TaskPanel
        title="עודכנו לאחרונה"
        icon={Clock}
        href="/tasks"
        tasks={stats.recentTasks}
        emptyLabel="עדיין אין משימות."
        className="lg:col-span-2"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

interface TaskPanelProps {
  title: string;
  icon: LucideIcon;
  href: string;
  tasks: Task[];
  emptyLabel: string;
  className?: string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function TaskPanel({
  title,
  icon: Icon,
  href,
  tasks,
  emptyLabel,
  className,
  onEdit,
  onDelete,
}: TaskPanelProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>

        {tasks.length > 0 ? (
          <CardAction>
            <ButtonLink variant="link" size="sm" href={href}>
              הצג הכל
            </ButtonLink>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent>
        {tasks.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  compact
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
