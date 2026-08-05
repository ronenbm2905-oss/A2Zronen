"use client";

import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { COLOR_CHIP_CLASSES } from "@/constants";
import { useDeleteTag, useTags, useTasks } from "@/hooks";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";

import { TagFormDialog } from "./tag-form-dialog";

/**
 * The tags screen.
 *
 * Each row shows how many tasks carry the tag, computed from the live task
 * array. That number is also what the delete confirmation quotes, so the user
 * knows the scope of the change before agreeing to it.
 */
export function TagsView() {
  const { data, isLoading, isError, error } = useTags();
  const { data: taskData } = useTasks();
  const deleteTag = useDeleteTag();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);

  const tags = useMemo(() => data ?? [], [data]);
  const tasks = useMemo(() => taskData ?? [], [taskData]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      for (const tagId of task.tagIds) {
        map.set(tagId, (map.get(tagId) ?? 0) + 1);
      }
    }
    return map;
  }, [tasks]);

  const deletingCount = deleting ? (counts.get(deleting.id) ?? 0) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="תגיות"
        description="סמן משימות לפי הקשר, ולא רק לפי פרויקט."
        actions={
          <Button variant="strong" onClick={() => setIsCreateOpen(true)}>
            <Plus data-icon="inline-start" aria-hidden />
            תגית חדשה
          </Button>
        }
      />

      {isError ? <ErrorState error={error} /> : null}
      {isLoading ? <LoadingState variant="list" count={4} /> : null}

      {!isLoading && !isError && tags.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="אין עדיין תגיות"
          description="צור תגית כדי לסמן משימות לפי הקשר, דחיפות או כל חתך אחר."
          action={
            <Button variant="strong" onClick={() => setIsCreateOpen(true)}>
              יצירת תגית
            </Button>
          }
        />
      ) : null}

      {tags.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {tags.map((tag) => {
                const count = counts.get(tag.id) ?? 0;

                return (
                  <li
                    key={tag.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 items-center rounded-4xl border px-2.5 text-xs",
                        COLOR_CHIP_CLASSES[tag.color],
                      )}
                    >
                      {tag.name}
                    </span>

                    <span className="flex-1 text-sm text-muted-foreground">
                      {count === 0 ? (
                        "לא משויכת למשימות"
                      ) : (
                        <Link
                          href={`/tasks?tags=${encodeURIComponent(tag.id)}`}
                          className="hover:underline underline-offset-4"
                        >
                          {count} משימות
                        </Link>
                      )}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`עריכת התגית ${tag.name}`}
                      onClick={() => setEditing(tag)}
                    >
                      <Pencil aria-hidden />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`מחיקת התגית ${tag.name}`}
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleting(tag)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <TagFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      <TagFormDialog
        key={editing?.id ?? "edit"}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        tag={editing ?? undefined}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="מחיקת תגית"
        description={
          <>
            התגית &rdquo;{deleting?.name}&ldquo; תימחק.{" "}
            {deletingCount > 0
              ? `היא תוסר מ-${deletingCount} משימות, אך המשימות עצמן לא יימחקו.`
              : "אין משימות המשויכות לתגית הזו."}
          </>
        }
        isPending={deleteTag.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteTag.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}
