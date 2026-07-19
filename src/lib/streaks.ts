import { addDaysISO, parseDate, todayISO, toISO } from "./dates";
import type { ActivityLog } from "./types";

function hasAny(log: ActivityLog): boolean {
  return (
    log.weightTraining ||
    log.cardio ||
    log.sport ||
    log.activeRecovery
  );
}

/** Sorted unique active dates for a person */
export function activeDates(logs: ActivityLog[]): string[] {
  return [...new Set(logs.filter(hasAny).map((l) => l.date))].sort();
}

export function currentStreak(
  logs: ActivityLog[],
  asOf: string = todayISO(),
): number {
  const set = new Set(activeDates(logs));
  if (set.size === 0) return 0;

  // Streak can include today or yesterday (if today not yet logged)
  let cursor = asOf;
  if (!set.has(cursor)) {
    cursor = addDaysISO(asOf, -1);
    if (!set.has(cursor)) return 0;
  }

  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function bestStreak(
  logs: ActivityLog[],
  rangeStart?: string,
  rangeEnd?: string,
): number {
  let dates = activeDates(logs);
  if (rangeStart) dates = dates.filter((d) => d >= rangeStart);
  if (rangeEnd) dates = dates.filter((d) => d <= rangeEnd);
  if (dates.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = parseDate(dates[i - 1]!);
    const curr = parseDate(dates[i]!);
    const expected = toISO(new Date(prev.getTime() + 86400000));
    // Compare calendar adjacency
    const nextDay = addDaysISO(dates[i - 1]!, 1);
    if (dates[i] === nextDay) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
    void curr;
    void expected;
  }
  return best;
}
