"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Track a CSS media query in JS.
 *
 * Used only where layout cannot express the difference — the sidebar becomes a
 * dismissible sheet on small screens, which is a behavioural change, not a
 * styling one. Anything achievable with a Tailwind breakpoint should stay in
 * CSS: this hook returns `false` during SSR, so a layout that depends on it
 * flashes its mobile form on first paint.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Matches Tailwind's `lg` breakpoint, where the sidebar becomes persistent. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
