"use client";

import { FolderPlus, ListPlus } from "lucide-react";

import { ButtonLink } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Shortcuts to the two things a user most often wants to create. */
export function QuickActions({ onCreateTask }: { onCreateTask: () => void }) {
  return (
    <Card className="bg-gradient-surface">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-base">מה בתוכנית?</p>
          <p className="text-sm text-muted-foreground">
            הוסף משימה חדשה או פתח פרויקט לארגון העבודה.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="strong" onClick={onCreateTask}>
            <ListPlus data-icon="inline-start" aria-hidden />
            משימה חדשה
          </Button>

          <ButtonLink variant="outline" href="/projects">
            <FolderPlus data-icon="inline-start" aria-hidden />
            פרויקט חדש
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}
