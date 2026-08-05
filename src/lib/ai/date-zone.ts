import "server-only";

/**
 * Timezone-anchored date handling for the agent.
 *
 * `@/utils/date` deliberately works in the *browser's* local timezone, because
 * that is where a due date is read. The agent runs on a server whose timezone is
 * whatever the host happens to be set to — usually UTC — so reusing those
 * helpers would make "tomorrow" mean a different day depending on the region a
 * deployment landed in.
 *
 * Everything here therefore takes an explicit IANA zone. The conversion trick is
 * the standard one: format an instant *in* the target zone, read the wall-clock
 * fields back, and the difference from the instant is that zone's offset at that
 * moment — which handles DST without a table.
 */

/**
 * The product's timezone. A2Z is a Hebrew, Israel-facing task manager and
 * `@/utils/date` already assumes each user stays in one zone; naming it here
 * makes the assumption checkable instead of implicit.
 */
export const APP_TIME_ZONE = "Asia/Jerusalem";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zoneOffsetMs(instant: Date): number {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );

  const wallClock = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    // `hour12: false` renders midnight as `24` in some ICU versions.
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );

  return wallClock - instant.getTime();
}

function parseDateOnly(
  dateOnly: string,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly.trim());
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/**
 * `"2026-08-06"` → the instant of midnight beginning that day in Israel.
 *
 * **Two correction passes, not one.** Pass one reads the offset at UTC midnight,
 * which on a DST-transition day is the offset on the *wrong side* of the change:
 * for 2026-03-27, Israel springs forward at 02:00 local — which is exactly
 * 00:00 UTC — so the naive guess picks +03:00, subtracts three hours, and lands
 * on 23:00 the previous evening. Re-reading the offset at the corrected instant
 * fixes it, and a third pass would never change anything because the second
 * instant is already inside the target day.
 */
export function dateOnlyToIso(dateOnly: string): string | null {
  const parts = parseDateOnly(dateOnly);
  if (!parts) return null;

  const utcMidnight = Date.UTC(parts.year, parts.month - 1, parts.day);

  const firstPass = utcMidnight - zoneOffsetMs(new Date(utcMidnight));
  const instant = new Date(utcMidnight - zoneOffsetMs(new Date(firstPass)));

  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

/** Inverse of {@link dateOnlyToIso}, for showing a stored due date to the model. */
export function isoToDateOnly(iso: string | null): string | null {
  if (!iso) return null;

  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;

  const parts = Object.fromEntries(
    partsFormatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Today in Israel, as `YYYY-MM-DD`. Anchors every relative date the model reads. */
export function todayDateOnly(): string {
  return isoToDateOnly(new Date().toISOString()) ?? "";
}

/** Hebrew weekday name for today — the model uses it for "this Sunday" phrasing. */
export function todayWeekdayHe(): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
  }).format(new Date());
}

/**
 * `YYYY-MM-DD` shifted by whole days.
 *
 * Pure calendar arithmetic — no instant is involved, and deliberately so. Going
 * through a timestamp and adding `days * 86_400_000` is wrong across a DST
 * change, where a civil day is 23 or 25 hours long: "the day before 2026-03-28"
 * would come back as the 26th. `Date.UTC` normalises overflow (day 32, month 13)
 * on a fixed-length day, which is exactly the calendar semantics wanted here.
 */
export function shiftDateOnly(dateOnly: string, days: number): string | null {
  const parts = parseDateOnly(dateOnly);
  if (!parts) return null;

  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  );

  if (Number.isNaN(shifted.getTime())) return null;

  const month = `${shifted.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${shifted.getUTCDate()}`.padStart(2, "0");

  return `${shifted.getUTCFullYear()}-${month}-${day}`;
}
