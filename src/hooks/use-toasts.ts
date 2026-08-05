"use client";

import { useSyncExternalStore } from "react";

import { getToasts, subscribeToToasts, type Toast } from "@/lib/toast";

/**
 * Subscribe the `<Toaster />` to the toast store.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: the store lives
 * outside React and is written from mutation callbacks, and this is the hook
 * built for exactly that, without tearing during concurrent renders.
 *
 * The server snapshot is a shared frozen array — returning a new `[]` each call
 * would loop the render.
 */
const EMPTY: Toast[] = [];

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribeToToasts, getToasts, () => EMPTY);
}
