import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfYear,
  format,
  getDaysInMonth,
  isAfter,
  isBefore,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subWeeks,
} from "date-fns";

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function parseDate(iso: string): Date {
  return parseISO(iso);
}

export function monthDays(year: number, month: number): string[] {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const days = getDaysInMonth(start);
  return Array.from({ length: days }, (_, i) =>
    format(new Date(year, month - 1, i + 1), "yyyy-MM-dd"),
  );
}

export function yearBounds(year: number): { start: string; end: string } {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));
  return { start: toISO(start), end: toISO(end) };
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
    // Lifetime: joinDate → today
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
  }).map(toISO);
}

export function lastNWeekStarts(n: number, asOf: string = todayISO()): Date[] {
  const base = startOfWeek(parseDate(asOf), { weekStartsOn: 1 });
  return Array.from({ length: n }, (_, i) => subWeeks(base, n - 1 - i));
}

export function clampMonth(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  return { start: toISO(start), end: toISO(end) };
}

export function isDateBefore(a: string, b: string) {
  return isBefore(parseDate(a), parseDate(b));
}

export function addDaysISO(iso: string, days: number): string {
  return toISO(addDays(parseDate(iso), days));
}
