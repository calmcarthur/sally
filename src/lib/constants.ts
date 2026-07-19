import type { ExerciseDef } from "./types";

export const ACTIVITY_TYPES = [
  {
    key: "weightTraining" as const,
    label: "Weight Training",
    short: "WT",
    color: "#1B4332",
    cssVar: "--color-wt",
  },
  {
    key: "cardio" as const,
    label: "Cardio",
    short: "Cardio",
    color: "#08814A",
    cssVar: "--color-cardio",
  },
  {
    key: "sport" as const,
    label: "Sport",
    short: "Sport",
    color: "#BCB381",
    cssVar: "--color-sport",
  },
  {
    key: "activeRecovery" as const,
    label: "Active Recovery",
    short: "AR",
    color: "#9CA3AF",
    cssVar: "--color-ar",
  },
] as const;

export type ActivityKey = (typeof ACTIVITY_TYPES)[number]["key"];

export const STREAK_THRESHOLD = 5;

/** First year the app tracks. Year picker = APP_START_YEAR … current year. */
export const APP_START_YEAR = 2025;

export const EXERCISES: ExerciseDef[] = [
  // Lifting
  { key: "bench", label: "Bench", unit: "lb", category: "lifting", direction: "higher", valueType: "number" },
  { key: "deadlift", label: "Deadlift", unit: "lb", category: "lifting", direction: "higher", valueType: "number" },
  { key: "squat", label: "Squat", unit: "lb", category: "lifting", direction: "higher", valueType: "number" },
  { key: "press", label: "Press", unit: "lb", category: "lifting", direction: "higher", valueType: "number" },
  // Calisthenics
  { key: "pullups", label: "Pull-Ups", unit: "reps", category: "calisthenics", direction: "higher", valueType: "number" },
  { key: "pushups", label: "Push-Ups", unit: "reps", category: "calisthenics", direction: "higher", valueType: "number" },
  { key: "dips", label: "Dips", unit: "reps", category: "calisthenics", direction: "higher", valueType: "number" },
  { key: "plank", label: "Plank", unit: "time", category: "calisthenics", direction: "higher", valueType: "time" },
  // Other
  { key: "deadhang", label: "Deadhang", unit: "sec", category: "other", direction: "higher", valueType: "number" },
  { key: "assault_bike_10min", label: "10 Min Assault Bike", unit: "c/lb", category: "other", direction: "higher", valueType: "number" },
  // Running (lower is better)
  { key: "40yd", label: "40yd", unit: "sec", category: "running", direction: "lower", valueType: "number" },
  { key: "100m", label: "100m", unit: "time", category: "running", direction: "lower", valueType: "time" },
  { key: "200m", label: "200m", unit: "time", category: "running", direction: "lower", valueType: "time" },
  { key: "400m", label: "400m", unit: "time", category: "running", direction: "lower", valueType: "time" },
  { key: "1k", label: "1k", unit: "time", category: "running", direction: "lower", valueType: "time" },
  { key: "1mile", label: "1 Mile", unit: "time", category: "running", direction: "lower", valueType: "time" },
  { key: "5k", label: "5k", unit: "time", category: "running", direction: "lower", valueType: "time" },
  { key: "10k", label: "10k", unit: "time", category: "running", direction: "lower", valueType: "time" },
  { key: "half", label: "Half", unit: "time", category: "running", direction: "lower", valueType: "time" },
  { key: "marathon", label: "Marathon", unit: "time", category: "running", direction: "lower", valueType: "time" },
];

export const EXERCISE_BY_KEY = Object.fromEntries(
  EXERCISES.map((e) => [e.key, e]),
) as Record<string, ExerciseDef>;

export const SEED_PEOPLE = [
  { name: "Arya", code: "AM001", joinDate: "2025-01-01" },
  { name: "Bilal", code: "BA002", joinDate: "2025-01-01" },
  { name: "Cal", code: "CM003", joinDate: "2025-01-01" },
  { name: "Jasper", code: "JC004", joinDate: "2025-06-15" },
  { name: "Logan", code: "LL005", joinDate: "2025-01-01" },
  { name: "Martin", code: "MG006", joinDate: "2025-01-01" },
  { name: "Sebastian", code: "SM007", joinDate: "2025-03-01" },
] as const;

export const ROASTS = [
  "Looking soft out there.",
  "The couch called — it misses you less when you train.",
  "Even Active Recovery counts. Even.",
  "Streaks don't lie. Maggots do.",
  "Someone's eating the leaderboard.",
  "AR ratio looking suspicious…",
  "Touch grass. Then touch iron.",
];

export const PRAISE = [
  "Absolute unit energy.",
  "Sally would be proud.",
  "On one. Keep cooking.",
  "Main character of the month.",
  "The spreadsheet feared this day.",
];
