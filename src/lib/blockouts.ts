import { addDaysISO, daysInRange } from "./dates";
import type { Blockout } from "./types";

/** Expand blockout ranges into a set of YYYY-MM-DD strings. */
export function blockoutDateSet(
  blockouts: Pick<Blockout, "startDate" | "endDate">[],
): Set<string> {
  const set = new Set<string>();
  for (const b of blockouts) {
    for (const d of daysInRange(b.startDate, b.endDate)) {
      set.add(d);
    }
  }
  return set;
}

/** Blocked dates that fall inside [rangeStart, rangeEnd] inclusive. */
export function blockedDaysInWindow(
  blockouts: Pick<Blockout, "startDate" | "endDate">[],
  rangeStart: string,
  rangeEnd: string,
): Set<string> {
  const set = new Set<string>();
  for (const b of blockouts) {
    const start = b.startDate > rangeStart ? b.startDate : rangeStart;
    const end = b.endDate < rangeEnd ? b.endDate : rangeEnd;
    if (start > end) continue;
    for (const d of daysInRange(start, end)) {
      set.add(d);
    }
  }
  return set;
}

export function isDateBlocked(
  date: string,
  blockouts: Pick<Blockout, "startDate" | "endDate">[],
): boolean {
  return blockouts.some((b) => date >= b.startDate && date <= b.endDate);
}

/**
 * After removing `date` from a range, return 0–2 remainder ranges.
 * Caller deletes the original and inserts remainders.
 */
export function splitRangeAroundDay(
  startDate: string,
  endDate: string,
  date: string,
): { startDate: string; endDate: string }[] {
  if (date < startDate || date > endDate) {
    return [{ startDate, endDate }];
  }
  const remainders: { startDate: string; endDate: string }[] = [];
  if (date > startDate) {
    remainders.push({
      startDate,
      endDate: addDaysISO(date, -1),
    });
  }
  if (date < endDate) {
    remainders.push({
      startDate: addDaysISO(date, 1),
      endDate,
    });
  }
  return remainders;
}
