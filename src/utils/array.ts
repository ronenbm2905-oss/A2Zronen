/**
 * Small array helpers. Stateless and dependency-free, per the `@/utils`
 * boundary rule — no network, env or SDK access here.
 */

/** Count items per key. Used for every dashboard breakdown. */
export function countBy<T, K extends string>(
  items: readonly T[],
  keyOf: (item: T) => K,
): Record<K, number> {
  const result = {} as Record<K, number>;

  for (const item of items) {
    const key = keyOf(item);
    result[key] = (result[key] ?? 0) + 1;
  }

  return result;
}

/** Group items by key, preserving input order within each group. */
export function groupBy<T, K extends string>(
  items: readonly T[],
  keyOf: (item: T) => K,
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;

  for (const item of items) {
    const key = keyOf(item);
    (result[key] ??= []).push(item);
  }

  return result;
}

/** Index a collection by id for O(1) lookup — the join used across screens. */
export function indexById<T extends { id: string }>(
  items: readonly T[],
): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

export function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/** True when the two arrays hold the same members, order-insensitively. */
export function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((value) => set.has(value));
}
