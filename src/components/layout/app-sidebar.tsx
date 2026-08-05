"use client";

import Link from "next/link";

import { APP_NAV_ITEMS } from "@/constants";
import { cn } from "@/lib/utils";

import { NavLink } from "./nav-link";

interface AppSidebarProps {
  /** Called after a navigation, so the mobile sheet can close itself. */
  onNavigate?: () => void;
  className?: string;
}

/**
 * The primary navigation list.
 *
 * Rendered twice: as a persistent column on `lg` and up, and inside the mobile
 * sheet below it. Sharing one component keeps the two in sync — nothing is more
 * annoying than a nav item that only exists on desktop.
 *
 * No `left`/`right` anywhere. Under `dir="rtl"` the shell's flex row places this
 * element against the right edge on its own; hard-coding a side would break the
 * moment the document direction changed.
 */
export function AppSidebar({ onNavigate, className }: AppSidebarProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-6 bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="px-3 font-heading text-lg text-gradient-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        A2Z Tasks
      </Link>

      <nav aria-label="ניווט ראשי" className="flex flex-1 flex-col gap-1">
        {APP_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
}
