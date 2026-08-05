import { QueryClient } from "@tanstack/react-query";

/**
 * Query client defaults, tuned for a realtime cache.
 *
 * Nearly every query in this app is backed by an `onSnapshot` subscription, so
 * the socket — not a timer — owns freshness. `staleTime: Infinity` plus the
 * disabled refetch triggers mean each `queryFn` runs exactly once per key, to
 * await the first snapshot; every update after that arrives via
 * `setQueryData` from the subscription.
 *
 * `retry: false` follows from the same reasoning: a failed subscription is a
 * rules or index problem, and retrying it would just repeat the same error more
 * expensively. Mutations do not retry either, because a POST that may have
 * partially applied should surface rather than be silently replayed.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
