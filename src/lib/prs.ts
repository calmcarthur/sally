import { EXERCISES, EXERCISE_BY_KEY } from "./constants";
import type { ExerciseDef, PersonalRecord } from "./types";

/** Parse time strings like 4.87, 0:03:19, 3:19, 1:22:05 into seconds */
export function parseTimeToSeconds(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v);

  const parts = v.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;

  if (parts.length === 2) {
    const [m, s] = parts;
    return (m ?? 0) * 60 + (s ?? 0);
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0);
  }
  return null;
}

export function parseComparable(
  exercise: ExerciseDef,
  value: string,
): number | null {
  if (exercise.valueType === "time") {
    return parseTimeToSeconds(value);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isBetter(
  exercise: ExerciseDef,
  candidate: string,
  current: string,
): boolean {
  const a = parseComparable(exercise, candidate);
  const b = parseComparable(exercise, current);
  if (a === null) return false;
  if (b === null) return true;
  return exercise.direction === "higher" ? a > b : a < b;
}

export type RecordHolder = {
  exerciseKey: string;
  personId: string | null;
  value: string | null;
  recordedOn: string | null;
};

export function computeRecordHolders(
  prs: PersonalRecord[],
): RecordHolder[] {
  return EXERCISES.map((ex) => {
    const relevant = prs.filter((p) => p.exerciseKey === ex.key);
    if (relevant.length === 0) {
      return {
        exerciseKey: ex.key,
        personId: null,
        value: null,
        recordedOn: null,
      };
    }
    let best = relevant[0]!;
    for (const pr of relevant.slice(1)) {
      if (isBetter(ex, pr.value, best.value)) best = pr;
    }
    return {
      exerciseKey: ex.key,
      personId: best.personId,
      value: best.value,
      recordedOn: best.recordedOn,
    };
  });
}

export function countRecordsHeld(
  personId: string,
  holders: RecordHolder[],
): number {
  return holders.filter((h) => h.personId === personId).length;
}

export function formatPrDisplay(exerciseKey: string, value: string): string {
  const ex = EXERCISE_BY_KEY[exerciseKey];
  if (!ex) return value;
  if (ex.unit === "time" || ex.valueType === "time") return value;
  return `${value} ${ex.unit}`;
}
