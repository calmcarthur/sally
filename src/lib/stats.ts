import {
  eligibleDayCount,
  lastNWeekStarts,
  toISO,
  todayISO,
  yearBounds,
} from "./dates";
import { computeRecordHolders, countRecordsHeld, type RecordHolder } from "./prs";
import { bestStreak, currentStreak } from "./streaks";
import type {
  ActivityLog,
  Person,
  PersonStats,
  PersonalRecord,
} from "./types";
import { addDays, format, isWithinInterval, parseISO } from "date-fns";

function hasAny(log: ActivityLog): boolean {
  return (
    log.weightTraining ||
    log.cardio ||
    log.sport ||
    log.activeRecovery
  );
}

function filterLogs(
  logs: ActivityLog[],
  personId: string,
  year: number | null,
  joinDate: string,
  asOf: string,
): ActivityLog[] {
  let filtered = logs.filter(
    (l) =>
      l.personId === personId &&
      hasAny(l) &&
      l.date >= joinDate &&
      l.date <= asOf,
  );
  if (year !== null) {
    const { start, end } = yearBounds(year);
    filtered = filtered.filter((l) => l.date >= start && l.date <= end);
  }
  return filtered;
}

function activityToArRatio(intense: number, ar: number): string {
  if (ar === 0) return intense === 0 ? "0:0" : `${intense}:0`;
  const ratio = Math.round(intense / ar);
  return `${ratio}:1`;
}

export function computePersonStats(
  person: Person,
  allLogs: ActivityLog[],
  allPrs: PersonalRecord[],
  year: number | null,
  asOf: string = todayISO(),
  holders?: RecordHolder[],
): PersonStats {
  const logs = filterLogs(allLogs, person.id, year, person.joinDate, asOf);
  // For current streak always use full history (still clamp to join..today)
  const personAllLogs = allLogs.filter(
    (l) =>
      l.personId === person.id &&
      l.date >= person.joinDate &&
      l.date <= asOf,
  );

  let weightTraining = 0;
  let cardio = 0;
  let sport = 0;
  let activeRecovery = 0;

  for (const l of logs) {
    if (l.weightTraining) weightTraining += 1;
    if (l.cardio) cardio += 1;
    if (l.sport) sport += 1;
    if (l.activeRecovery) activeRecovery += 1;
  }

  const totalExercises = weightTraining + cardio + sport + activeRecovery;
  const intense = weightTraining + cardio + sport;
  const daysActive = new Set(logs.map((l) => l.date)).size;
  const eligibleDays = eligibleDayCount(person.joinDate, year, asOf);
  const percentDaysWorked =
    eligibleDays === 0
      ? 0
      : Math.round((daysActive / eligibleDays) * 1000) / 10;

  const recordHolders =
    holders ?? computeRecordHolders(allPrs, [person.id]);
  const sallyRecordsHeld = countRecordsHeld(person.id, recordHolders);

  const rangeStart = year !== null ? yearBounds(year).start : undefined;
  const rangeEnd = year !== null ? yearBounds(year).end : undefined;

  const mixTotal = totalExercises || 1;
  const categoryMix = {
    weightTraining: Math.round((weightTraining / mixTotal) * 100),
    cardio: Math.round((cardio / mixTotal) * 100),
    sport: Math.round((sport / mixTotal) * 100),
    activeRecovery: Math.round((activeRecovery / mixTotal) * 100),
  };

  const monthlyTotals: { month: number; total: number }[] = [];
  if (year !== null) {
    for (let m = 1; m <= 12; m++) {
      const prefix = `${year}-${String(m).padStart(2, "0")}`;
      const monthLogs = logs.filter((l) => l.date.startsWith(prefix));
      let total = 0;
      for (const l of monthLogs) {
        if (l.weightTraining) total += 1;
        if (l.cardio) total += 1;
        if (l.sport) total += 1;
        if (l.activeRecovery) total += 1;
      }
      monthlyTotals.push({ month: m, total });
    }
  }

  const weekStarts = lastNWeekStarts(24, asOf);
  const weeklyActive = weekStarts.map((start) => {
    const end = addDays(start, 6);
    let activeDays = 0;
    for (const l of personAllLogs) {
      if (!hasAny(l)) continue;
      const d = parseISO(l.date);
      if (isWithinInterval(d, { start, end })) activeDays += 1;
    }
    return activeDays >= 4;
  });

  return {
    person,
    weightTraining,
    cardio,
    sport,
    activeRecovery,
    totalExercises,
    activityToArRatio: activityToArRatio(intense, activeRecovery),
    daysActive,
    eligibleDays,
    percentDaysWorked,
    currentStreak: currentStreak(personAllLogs, asOf),
    bestStreak: bestStreak(personAllLogs, rangeStart, rangeEnd),
    sallyRecordsHeld,
    categoryMix,
    monthlyTotals,
    weeklyActive,
  };
}

export function computeAllStats(
  people: Person[],
  allLogs: ActivityLog[],
  allPrs: PersonalRecord[],
  year: number | null,
): PersonStats[] {
  const activeIds = people.map((p) => p.id);
  const holders = computeRecordHolders(allPrs, activeIds);
  return people.map((p) =>
    computePersonStats(p, allLogs, allPrs, year, todayISO(), holders),
  );
}

export type Leaderboard = {
  id: string;
  title: string;
  subtitle: string;
  winnerName: string | null;
  winnerValue: string;
};

export function buildLeaderboards(stats: PersonStats[]): Leaderboard[] {
  if (stats.length === 0) return [];

  const by = <T>(
    pick: (s: PersonStats) => T,
    compare: (a: T, b: T) => number,
    formatVal: (s: PersonStats) => string,
  ) => {
    const sorted = [...stats].sort((a, b) => compare(pick(a), pick(b)));
    const winner = sorted[0]!;
    return { winner, value: formatVal(winner) };
  };

  const mostActive = by(
    (s) => s.daysActive,
    (a, b) => b - a,
    (s) => `${s.daysActive} days`,
  );
  const longestStreak = by(
    (s) => s.bestStreak,
    (a, b) => b - a,
    (s) => `${s.bestStreak} days`,
  );
  const mostWt = by(
    (s) => s.weightTraining,
    (a, b) => b - a,
    (s) => `${s.weightTraining} sessions`,
  );
  const mostCardio = by(
    (s) => s.cardio,
    (a, b) => b - a,
    (s) => `${s.cardio} sessions`,
  );
  const arEvade = by(
    (s) => {
      const intense = s.weightTraining + s.cardio + s.sport;
      return s.activeRecovery === 0
        ? intense * 1000
        : intense / s.activeRecovery;
    },
    (a, b) => b - a,
    (s) => s.activityToArRatio,
  );
  const consistency = by(
    (s) => s.percentDaysWorked,
    (a, b) => b - a,
    (s) => `${s.percentDaysWorked}%`,
  );
  const records = by(
    (s) => s.sallyRecordsHeld,
    (a, b) => b - a,
    (s) => `${s.sallyRecordsHeld} held`,
  );

  return [
    {
      id: "active",
      title: "Most days active",
      subtitle: "Showed up. Simple.",
      winnerName: mostActive.winner.person.name,
      winnerValue: mostActive.value,
    },
    {
      id: "streak",
      title: "Longest streak",
      subtitle: "Consistency merchant.",
      winnerName: longestStreak.winner.person.name,
      winnerValue: longestStreak.value,
    },
    {
      id: "consistency",
      title: "% days worked on yourself",
      subtitle: "Eligible days only — mid-year joiners safe.",
      winnerName: consistency.winner.person.name,
      winnerValue: consistency.value,
    },
    {
      id: "wt",
      title: "Iron throne",
      subtitle: "Most weight training.",
      winnerName: mostWt.winner.person.name,
      winnerValue: mostWt.value,
    },
    {
      id: "cardio",
      title: "Cardio merchant",
      subtitle: "Heart rate in the group chat.",
      winnerName: mostCardio.winner.person.name,
      winnerValue: mostCardio.value,
    },
    {
      id: "ar",
      title: "AR evade artist",
      subtitle: "Highest activity : AR ratio.",
      winnerName: arEvade.winner.person.name,
      winnerValue: arEvade.value,
    },
    {
      id: "records",
      title: "Sally record hoarder",
      subtitle: "Current #1s on the board.",
      winnerName: records.winner.person.name,
      winnerValue: records.value,
    },
  ];
}

export function monthLabel(month: number): string {
  return format(new Date(2000, month - 1, 1), "MMM");
}

export { toISO };
