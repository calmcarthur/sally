export type ActivityFlags = {
  weightTraining: boolean;
  cardio: boolean;
  sport: boolean;
  activeRecovery: boolean;
};

export type Person = {
  id: string;
  name: string;
  code: string;
  joinDate: string; // YYYY-MM-DD
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  personId: string;
  date: string; // YYYY-MM-DD
} & ActivityFlags;

export type PersonalRecord = {
  id: string;
  personId: string;
  exerciseKey: string;
  value: string;
  recordedOn: string; // YYYY-MM-DD
};

export type ExerciseDef = {
  key: string;
  label: string;
  unit: string;
  category: "lifting" | "calisthenics" | "other" | "running";
  /** higher = better (lbs, reps); lower = better (times) */
  direction: "higher" | "lower";
  /** how to parse stored value for comparison */
  valueType: "number" | "time";
};

export type DayCell = ActivityFlags & {
  date: string;
  hasActivity: boolean;
};

export type PersonMonthRow = {
  person: Person;
  currentStreak: number;
  days: DayCell[];
};

export type PersonStats = {
  person: Person;
  weightTraining: number;
  cardio: number;
  sport: number;
  activeRecovery: number;
  totalExercises: number;
  activityToArRatio: string;
  daysActive: number;
  eligibleDays: number;
  percentDaysWorked: number;
  currentStreak: number;
  bestStreak: number;
  sallyRecordsHeld: number;
  categoryMix: {
    weightTraining: number;
    cardio: number;
    sport: number;
    activeRecovery: number;
  };
  monthlyTotals: { month: number; total: number }[];
  weeklyActive: boolean[]; // last 12 weeks, oldest → newest
};
