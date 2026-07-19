import { ACTIVITY_TYPES } from "./constants";
import { monthDays } from "./dates";
import type { ActivityLog, Person, PersonMonthRow } from "./types";

export function buildMonthRows(
  people: Person[],
  logs: ActivityLog[],
  year: number,
  month: number,
  streakByPerson: Map<string, number>,
): PersonMonthRow[] {
  const days = monthDays(year, month);
  const byKey = new Map<string, ActivityLog>();
  for (const log of logs) {
    byKey.set(`${log.personId}:${log.date}`, log);
  }

  return people.map((person) => ({
    person,
    currentStreak: streakByPerson.get(person.id) ?? 0,
    days: days.map((date) => {
      const log = byKey.get(`${person.id}:${date}`);
      const weightTraining = log?.weightTraining ?? false;
      const cardio = log?.cardio ?? false;
      const sport = log?.sport ?? false;
      const activeRecovery = log?.activeRecovery ?? false;
      return {
        date,
        weightTraining,
        cardio,
        sport,
        activeRecovery,
        hasActivity: weightTraining || cardio || sport || activeRecovery,
      };
    }),
  }));
}

export function activityColor(key: (typeof ACTIVITY_TYPES)[number]["key"]) {
  return ACTIVITY_TYPES.find((a) => a.key === key)!.color;
}
