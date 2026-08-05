"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import type { ReactNode } from "react";

import { Toaster } from "@/components/common/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "./auth-provider";
import { QueryProvider } from "./query-provider";

/**
 * Composition root for client-side context providers.
 *
 * The nesting order is load-bearing:
 *
 * - `DirectionProvider` outermost, because Base UI reads direction at runtime to
 *   anchor popups, mirror arrow-key semantics and pick a slide direction. The
 *   `dir="rtl"` on `<html>` styles the document but tells Base UI nothing; without
 *   this provider, selects and menus open against the wrong edge — a bug that
 *   reads like broken CSS and sends you looking in the wrong place.
 * - `QueryProvider` next, because `AuthProvider` calls `useQueryClient()` to
 *   clear the cache on sign-out.
 * - `AuthProvider` last, so every feature hook below it has both contexts.
 *
 * `<Toaster />` is a sibling of `children` rather than a wrapper: it reads a
 * module-level store, so it needs no context and must not re-render the tree.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <DirectionProvider direction="rtl">
      <QueryProvider>
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </AuthProvider>
      </QueryProvider>
    </DirectionProvider>
  );
}
