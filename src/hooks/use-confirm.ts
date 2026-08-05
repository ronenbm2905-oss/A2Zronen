"use client";

import { useCallback, useState } from "react";

/**
 * State for a confirm-before-destroy dialog.
 *
 * Every delete in this app routes through one, so this hook keeps the wiring to
 * three lines at each call site: `ask(target)` to open, `confirm()` to run the
 * action, `close()` to dismiss.
 *
 * The target is held rather than passed at confirm time, so the dialog can name
 * what is about to be deleted — "האם למחוק את הפרויקט 'עבודה'?" — instead of
 * asking an abstract question.
 */
export function useConfirm<T>(onConfirm: (target: T) => Promise<unknown> | unknown) {
  const [target, setTarget] = useState<T | null>(null);
  const [isPending, setIsPending] = useState(false);

  const ask = useCallback((next: T) => {
    setTarget(next);
  }, []);

  const close = useCallback(() => {
    // Ignore a dismiss while the action is running: the dialog is the only place
    // showing that something is in progress.
    setIsPending((pending) => {
      if (!pending) setTarget(null);
      return pending;
    });
  }, []);

  const confirm = useCallback(async () => {
    if (target === null) return;

    setIsPending(true);
    try {
      await onConfirm(target);
      setTarget(null);
    } finally {
      setIsPending(false);
    }
  }, [onConfirm, target]);

  return { target, isOpen: target !== null, isPending, ask, close, confirm };
}
