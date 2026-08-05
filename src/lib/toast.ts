/**
 * Toast notifications — the app's "success state" and non-blocking error channel.
 *
 * A ~60-line store rather than a dependency. Base UI ships a `toast` primitive,
 * but every mutation hook needs to fire a toast from outside React (inside a
 * `useMutation` callback), which wants a module-level emitter regardless. This
 * gives one, keeps the surface to `toast.success` / `toast.error` / `toast.info`,
 * and leaves `<Toaster />` free to render it however the design system prefers.
 *
 * Swapping in another library later means rewriting this file only.
 */

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
}

type Listener = (toasts: Toast[]) => void;

/** Errors linger; confirmations should not sit in the corner reproachfully. */
const DURATIONS: Record<ToastVariant, number> = {
  success: 3_000,
  info: 4_000,
  error: 6_000,
};

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit(): void {
  for (const listener of listeners) listener(toasts);
}

export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): Toast[] {
  return toasts;
}

export function dismissToast(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }

  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function push(variant: ToastVariant, message: string): string {
  const id = crypto.randomUUID();

  // Newest first: the list renders top-down from the corner, and the most
  // recent result is the one the user is waiting on.
  toasts = [{ id, variant, message }, ...toasts].slice(0, 4);
  emit();

  timers.set(
    id,
    setTimeout(() => dismissToast(id), DURATIONS[variant]),
  );

  return id;
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
} as const;
