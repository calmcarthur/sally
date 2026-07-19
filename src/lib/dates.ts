import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  isAfter,
  isBefore,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { todayInTimeZone } from "./validate";

/** "Today" in the app timezone (default Europe/London). */
export function todayISO(): string {
  return todayInTimeZone();
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(iso: string): Date {
  // Noon UTC avoids DST edge cases when only the calendar date matters
  return parseISO(`${iso}T12:00:00`);
}

/** Calendar days in a month — pure date math, no server TZ. */
export function monthDays(year: number, month: number): string[] {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  });
}

export function yearBounds(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

/** Eligible days for % worked: max(yearStart, joinDate) .. min(today, yearEnd) */
export function eligibleDayCount(
  joinDate: string,
  year: number | null,
  asOf: string = todayISO(),
): number {
  const asOfDate = parseDate(asOf);
  let rangeStart: Date;
  let rangeEnd: Date;

  if (year === null) {
    rangeStart = parseDate(joinDate);
    rangeEnd = asOfDate;
  } else {
    const { start, end } = yearBounds(year);
    rangeStart = maxDate([parseDate(start), parseDate(joinDate)]);
    rangeEnd = minDate([parseDate(end), asOfDate]);
  }

  if (isAfter(rangeStart, rangeEnd)) return 0;
  return differenceInCalendarDays(rangeEnd, rangeStart) + 1;
}

export function daysInRange(start: string, end: string): string[] {
  if (isAfter(parseDate(start), parseDate(end))) return [];
  return eachDayOfInterval({
    start: parseDate(start),
    end: parseDate(end),
  }).map((d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
}

export function lastNWeekStarts(n: number, asOf: string = todayISO()): Date[] {
  const base = startOfWeek(parseDate(asOf), { weekStartsOn: 1 });
  return Array.from({ length: n }, (_, i) => subWeeks(base, n - 1 - i));
}

export function isDateBefore(a: string, b: string) {
  return isBefore(parseDate(a), parseDate(b));
}

export function addDaysISO(iso: string, days: number): string {
  return toISO(addDays(parseDate(iso), days));
}
