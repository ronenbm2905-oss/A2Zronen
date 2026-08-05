import type { ISODateString, Nullable } from "@/types";

/**
 * Timestamp normalization, shared by both read paths.
 *
 * Firestore stores instants as `Timestamp`, which is the right choice on disk:
 * `serverTimestamp()` is unspoofable, and `dueDate` range queries are native and
 * index-friendly. But `Timestamp` is a **different class** in
 * `firebase-admin/firestore` than in `firebase/firestore`, and
 * `NextResponse.json()` would serialize one into `{_seconds, _nanoseconds}`.
 *
 * So nothing above the service layer ever sees a `Timestamp`. These helpers are
 * duck-typed on `.toDate()`, which both classes expose, so the same mapper works
 * for an Admin snapshot and a Web SDK snapshot.
 */

interface TimestampLike {
  toDate(): Date;
}

function isTimestampLike(value: unknown): value is TimestampLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as TimestampLike).toDate === "function"
  );
}

/** `Timestamp | null | anything else` → ISO string or `null`. */
export function tsToIso(value: unknown): Nullable<ISODateString> {
  if (isTimestampLike(value)) {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  // Tolerate a raw ISO string, which is what a document written by an older
  // shape or seeded by hand would carry.
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

/**
 * Same as {@link tsToIso}, for fields the domain types declare non-nullable.
 *
 * The fallback matters because `serverTimestamp()` resolves to `null` in the
 * local echo of a write. All writes here are server-side, so the client never
 * observes a pending write — but a missing `createdAt` should degrade to a
 * plausible value rather than crash a `.toISOString()` call downstream.
 */
export function tsToIsoRequired(
  value: unknown,
  fallback: Date = new Date(),
): ISODateString {
  return tsToIso(value) ?? fallback.toISOString();
}

/** Read a string field with a safe default — Firestore documents are untyped. */
export function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Read a `string[]` field, discarding non-string members. */
export function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Read a nullable string field (`projectId`). */
export function readNullableString(value: unknown): Nullable<string> {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Read a nullable number field (a Telegram chat id).
 *
 * `NaN` is excluded explicitly: it is a `number` to `typeof`, survives a JSON
 * round-trip as `null`, and would otherwise be handed to `sendMessage` as a
 * chat id.
 */
export function readNullableNumber(value: unknown): Nullable<number> {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Read a field constrained to a closed union, falling back when the stored
 * value is absent or unrecognised.
 */
export function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}
