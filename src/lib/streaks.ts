import { addDaysISO, todayISO } from "./dates";
import type { ActivityLog } from "./types";

function hasAny(log: ActivityLog): boolean {
  return (
    log.weightTraining ||
    log.cardio ||
    log.sport ||
    log.activeRecovery
  );
}

/** Sorted unique active dates for a person (excludes blocked days). */
export function activeDates(
  logs: ActivityLog[],
  blocked: Set<string> = new Set(),
): string[] {
  return [
    ...new Set(
      logs
        .filter(hasAny)
        .map((l) => l.date)
        .filter((d) => !blocked.has(d)),
    ),
  ].sort();
}

/**
 * Current streak walking backward from asOf.
 * Blocked days are skipped (do not break, do not count).
 */
export function currentStreakFromDates(
  dates: string[],
  asOf: string = todayISO(),
  blocked: Set<string> = new Set(),
): number {
  const set = new Set(dates);
  if (set.size === 0) return 0;

  let cursor = asOf;
  // Grace: if today isn't active and isn't blocked, start from yesterday
  if (!set.has(cursor) && !blocked.has(cursor)) {
    cursor = addDaysISO(asOf, -1);
  }

  while (blocked.has(cursor)) {
    cursor = addDaysISO(cursor, -1);
  }

  if (!set.has(cursor)) return 0;

  let streak = 0;
  while (true) {
    if (blocked.has(cursor)) {
      cursor = addDaysISO(cursor, -1);
      continue;
    }
    if (set.has(cursor)) {
      streak += 1;
      cursor = addDaysISO(cursor, -1);
      continue;
    }
    break;
  }
  return streak;
}

export function currentStreak(
  logs: ActivityLog[],
  asOf: string = todayISO(),
  blocked: Set<string> = new Set(),
): number {
  return currentStreakFromDates(activeDates(logs, blocked), asOf, blocked);
}

function isConsecutiveAllowingBlocked(
  earlier: string,
  later: string,
  blocked: Set<string>,
): boolean {
  let cursor = addDaysISO(earlier, 1);
  while (cursor < later) {
    if (!blocked.has(cursor)) return false;
    cursor = addDaysISO(cursor, 1);
  }
  return cursor === later;
}

export function bestStreak(
  logs: ActivityLog[],
  rangeStart?: string,
  rangeEnd?: string,
  blocked: Set<string> = new Set(),
): number {
  let dates = activeDates(logs, blocked);
  if (rangeStart) dates = dates.filter((d) => d >= rangeStart);
  if (rangeEnd) dates = dates.filter((d) => d <= rangeEnd);
  if (dates.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1]!;
    const curr = dates[i]!;
    if (
      curr === addDaysISO(prev, 1) ||
      isConsecutiveAllowingBlocked(prev, curr, blocked)
    ) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}
