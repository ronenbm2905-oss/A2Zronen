"use client";

import { Menu, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { AppSidebar } from "./app-sidebar";
import { UserMenu } from "./user-menu";

interface AppTopbarProps {
  onCreateTask: () => void;
}

/**
 * Mobile menu trigger, quick-create, and the account menu.
 *
 * The sheet opens from `side="right"` because that is the inline-start edge in
 * Hebrew — the navigation should slide in from the same side it occupies on
 * desktop, otherwise the two layouts feel like different apps.
 */
export function AppTopbar({ onCreateTask }: AppTopbarProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-sm">
      <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="פתיחת תפריט הניווט"
            >
              <Menu aria-hidden />
            </Button>
          }
        />

        <SheetContent side="right" className="w-72 p-4">
          <SheetTitle className="sr-only">ניווט ראשי</SheetTitle>
          <AppSidebar onNavigate={() => setIsNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <Button variant="strong" size="sm" onClick={onCreateTask}>
        <Plus data-icon="inline-start" aria-hidden />
        משימה חדשה
      </Button>

      <UserMenu />
    </header>
  );
}
