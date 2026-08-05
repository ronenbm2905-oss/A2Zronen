"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { ColorDot } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  openCount: number;
  totalCount: number;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({
  project,
  openCount,
  totalCount,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  return (
    <Card className="h-full transition-colors hover:border-primary/30">
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          <ColorDot color={project.color} />
          <Link
            href={`/projects/${project.id}`}
            className="truncate hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {project.name}
          </Link>
        </CardTitle>

        {project.description ? (
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        ) : null}

        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`פעולות עבור הפרויקט ${project.name}`}
                >
                  <MoreHorizontal aria-hidden />
                </Button>
              }
            />

            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit(project)}>
                <Pencil aria-hidden />
                עריכה
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(project)}
              >
                <Trash2 aria-hidden />
                מחיקה
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? "אין משימות בפרויקט"
            : `${openCount} פתוחות מתוך ${totalCount} משימות`}
        </p>
      </CardContent>
    </Card>
  );
}
