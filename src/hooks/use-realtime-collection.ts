"use client";

import { hashKey, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Unsubscribe } from "firebase/firestore";
import { useEffect, useRef } from "react";

import { describeError, logger } from "@/lib/logger";
import {
  awaitFirstSnapshot,
  discardFirstSnapshot,
  rejectFirstSnapshot,
  settleFirstSnapshot,
} from "@/lib/query/realtime";

export type SubscribeFn<T> = (
  onData: (rows: T[]) => void,
  onError: (error: unknown) => void,
) => Unsubscribe;

/**
 * Expose a Firestore realtime subscription as an ordinary React Query result.
 *
 * `useQuery` owns the lifecycle (`isLoading`, `isError`, `data`); `onSnapshot`
 * owns the data. The first snapshot resolves the `queryFn` promise; every one
 * after that writes straight to the cache. Consumers get the same shape they
 * would from a fetched query, so `<LoadingState>` and `<ErrorState>` wire up
 * identically and no component needs to know its data is live.
 *
 * Two details are load-bearing:
 *
 * - **The effect depends on `hash`, not on `subscribe`.** Callers pass an inline
 *   arrow, whose identity changes every render. Keying the effect on it would
 *   tear down and re-open the socket on every render — a read storm against
 *   Firestore and a UI that never settles. `subscribeRef` holds the latest
 *   callback so the effect can stay pinned to the query key.
 *
 * - **Unmounting before the first snapshot discards the waiter.** Otherwise the
 *   promise stays pending forever and pins the `queryFn`.
 */
export function useRealtimeCollection<T>(
  queryKey: readonly unknown[],
  subscribe: SubscribeFn<T>,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const hash = hashKey(queryKey);

  const subscribeRef = useRef(subscribe);

  // Kept current in its own effect (no dependency array) rather than assigned
  // during render, which would be a render-phase side effect. Effects run in
  // declaration order, so this lands before the subscription effect below.
  useEffect(() => {
    subscribeRef.current = subscribe;
  });

  useEffect(() => {
    if (!enabled) return;

    let settled = false;
    let unsubscribe: Unsubscribe | undefined;

    try {
      unsubscribe = subscribeRef.current(
        (rows) => {
          if (!settled) {
            settled = true;
            settleFirstSnapshot(hash, rows);
          }
          queryClient.setQueryData<T[]>(queryKey, rows);
        },
        (error) => {
          // Inlined into the message, not left to `meta`: the Next.js dev error
          // overlay renders extra console arguments as `{}`, so a Firestore
          // `failed-precondition` (missing composite index) or `permission-denied`
          // is invisible exactly where it is needed.
          logger.error(`Realtime subscription failed — ${describeError(error)}`, {
            hash,
            error,
          });

          if (!settled) {
            settled = true;
            rejectFirstSnapshot(hash, error);
          }
          // Once data has been delivered, a later error (a dropped connection,
          // say) should not blank the screen — the last good snapshot stays.
        },
      );
    } catch (error) {
      // `getFirestoreDb()` throws when Firebase is unconfigured. Reject rather
      // than let it escape the effect, so the query reports an error state
      // instead of crashing the tree.
      logger.error(
        `Could not open realtime subscription — ${describeError(error)}`,
        { hash, error },
      );
      settled = true;
      rejectFirstSnapshot(hash, error);
    }

    return () => {
      if (!settled) discardFirstSnapshot(hash);
      unsubscribe?.();
    };
    // `queryKey` is represented by `hash`; including the array itself would
    // reintroduce the identity churn this hook exists to avoid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hash, queryClient]);

  return useQuery<T[]>({
    queryKey,
    queryFn: () => awaitFirstSnapshot<T>(hash),
    enabled,
    staleTime: Infinity,
  });
}
