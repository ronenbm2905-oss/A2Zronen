import type { ISODateString, Maybe } from "@/types";

/**
 * Date helpers for a date-only due date.
 *
 * Two conventions this module exists to keep consistent:
 *
 * 1. **A due date is an instant, but it means a day.** `<input type="date">`
 *    yields `"2026-08-05"`. We store the instant of *local* midnight starting
 *    that day, so "today" and "overdue" compare correctly for the person
 *    looking at the screen. This assumes a user stays in one timezone — true
 *    for this product, and the alternative (storing a bare `YYYY-MM-DD` string)
 *    gives up native range queries in Firestore.
 *
 * 2. **Never format a date in a Server Component.** `Intl` resolves against the
 *    server's timezone, so the server HTML and the client re-render disagree
 *    and React reports a hydration mismatch. Every caller of `formatDateHe` and
 *    `formatRelativeHe` must be inside a client component.
 */

const MS_PER_DAY = 86_400_000;

export function startOfDay(value: Date = new Date()): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

/** `null` for blank input, so callers can pass an optional field straight in. */
export function parseDate(value: Maybe<ISODateString>): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `"2026-08-05"` → the instant of local midnight beginning that day. */
export function fromDateInputValue(value: string): ISODateString | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Inverse of {@link fromDateInputValue}, for populating `<input type="date">`. */
export function toDateInputValue(value: Maybe<ISODateString>): string {
  const date = parseDate(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isToday(value: Maybe<ISODateString>): boolean {
  const date = parseDate(value);
  if (!date) return false;

  const today = startOfDay();
  return date >= today && date < addDays(today, 1);
}

/**
 * Strictly before today. A task due *today* is not late yet, which is why this
 * compares against the start of today rather than "now".
 */
export function isPastDue(value: Maybe<ISODateString>): boolean {
  const date = parseDate(value);
  return date !== null && date < startOfDay();
}

export function isUpcoming(value: Maybe<ISODateString>): boolean {
  const date = parseDate(value);
  return date !== null && date >= addDays(startOfDay(), 1);
}

/** Whole days from today; negative in the past. `null` when there is no date. */
export function daysUntil(value: Maybe<ISODateString>): number | null {
  const date = parseDate(value);
  if (!date) return null;

  return Math.round((startOfDay(date).getTime() - startOfDay().getTime()) / MS_PER_DAY);
}

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Client-side only — see the module note about hydration. */
export function formatDateHe(value: Maybe<ISODateString>): string {
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : "";
}

/** Client-side only — see the module note about hydration. */
export function formatDateTimeHe(value: Maybe<ISODateString>): string {
  const date = parseDate(value);
  return date ? dateTimeFormatter.format(date) : "";
}

/**
 * A short Hebrew phrase for a due date: "היום", "מחר", "לפני 3 ימים", or the
 * formatted date once it is far enough away for a relative phrase to stop
 * being more useful than the date itself.
 *
 * Client-side only — see the module note about hydration.
 */
export function formatRelativeHe(value: Maybe<ISODateString>): string {
  const days = daysUntil(value);
  if (days === null) return "";

  if (days === 0) return "היום";
  if (days === 1) return "מחר";
  if (days === -1) return "אתמול";
  if (days > 1 && days <= 7) return `בעוד ${days} ימים`;
  if (days < -1 && days >= -7) return `לפני ${Math.abs(days)} ימים`;

  return formatDateHe(value);
}
