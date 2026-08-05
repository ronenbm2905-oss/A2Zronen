/**
 * The bridge between a push-based subscription and React Query's pull-based
 * `queryFn`.
 *
 * `useQuery` wants a promise it can await once; `onSnapshot` wants to call back
 * repeatedly. This registry reconciles them: the effect that opens the
 * subscription resolves the pending promise with the **first** snapshot, and
 * every snapshot after that is written straight into the cache.
 *
 * The payoff is that `isLoading` / `isError` / `data` behave exactly as they do
 * for an ordinary fetched query, so `<LoadingState>` and `<ErrorState>` wire up
 * the same way and components never learn their data is live.
 *
 * Keyed by React Query's own `hashKey(queryKey)` so the registry and the cache
 * agree on identity by construction.
 */

interface Resolver {
  resolve: (rows: unknown[]) => void;
  reject: (error: unknown) => void;
}

// Type-erased: one registry serves every collection. The single cast happens in
// `awaitFirstSnapshot`, where the caller's `T` is still known and the key that
// pairs the two sides is the same hash.
const pending = new Map<string, Resolver[]>();

/** Called by the `queryFn`: a promise settled by the first snapshot. */
export function awaitFirstSnapshot<T>(hash: string): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const waiters = pending.get(hash) ?? [];
    waiters.push({ resolve: resolve as (rows: unknown[]) => void, reject });
    pending.set(hash, waiters);
  });
}

/** Called by the subscription on its first successful snapshot. */
export function settleFirstSnapshot(hash: string, rows: unknown[]): void {
  const waiters = pending.get(hash);
  if (!waiters) return;

  pending.delete(hash);
  for (const waiter of waiters) waiter.resolve(rows);
}

/** Called when the subscription fails before delivering anything. */
export function rejectFirstSnapshot(hash: string, error: unknown): void {
  const waiters = pending.get(hash);
  if (!waiters) return;

  pending.delete(hash);
  for (const waiter of waiters) waiter.reject(error);
}

/**
 * Drop any waiter for a key without settling it.
 *
 * Used when a subscription unmounts before its first snapshot: leaving the
 * promise pending forever would pin the `queryFn` and, with it, the component
 * tree that awaited it.
 */
export function discardFirstSnapshot(hash: string): void {
  pending.delete(hash);
}
