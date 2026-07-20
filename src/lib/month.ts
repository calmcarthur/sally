import { ACTIVITY_TYPES } from "./constants";
import { monthDays } from "./dates";
import { isDateBlocked } from "./blockouts";
import type {
  ActivityLog,
  Blockout,
  Person,
  PersonMonthRow,
} from "./types";

export function buildMonthRows(
  people: Person[],
  logs: ActivityLog[],
  year: number,
  month: number,
  streakByPerson: Map<string, number>,
  blockouts: Blockout[] = [],
): PersonMonthRow[] {
  const days = monthDays(year, month);
  const byKey = new Map<string, ActivityLog>();
  for (const log of logs) {
    byKey.set(`${log.personId}:${log.date}`, log);
  }
  const blockoutsByPerson = new Map<string, Blockout[]>();
  for (const b of blockouts) {
    const list = blockoutsByPerson.get(b.personId) ?? [];
    list.push(b);
    blockoutsByPerson.set(b.personId, list);
  }

  return people.map((person) => {
    const personBlockouts = blockoutsByPerson.get(person.id) ?? [];
    return {
      person,
      currentStreak: streakByPerson.get(person.id) ?? 0,
      days: days.map((date) => {
        const blocked = isDateBlocked(date, personBlockouts);
        const log = byKey.get(`${person.id}:${date}`);
        const weightTraining = !blocked && (log?.weightTraining ?? false);
        const cardio = !blocked && (log?.cardio ?? false);
        const sport = !blocked && (log?.sport ?? false);
        const activeRecovery = !blocked && (log?.activeRecovery ?? false);
        return {
          date,
          weightTraining,
          cardio,
          sport,
          activeRecovery,
          hasActivity: weightTraining || cardio || sport || activeRecovery,
          blocked,
        };
      }),
    };
  });
}

export function activityColor(key: (typeof ACTIVITY_TYPES)[number]["key"]) {
  return ACTIVITY_TYPES.find((a) => a.key === key)!.color;
}
