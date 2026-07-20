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
  /** false = soft-removed; data kept, hidden from board until re-added by code */
  active: boolean;
  /** Set while soft-removed; used to auto-blockout the gap on restore */
  deactivatedAt: string | null; // YYYY-MM-DD
};

export type ActivityLog = {
  id: string;
  personId: string;
  date: string; // YYYY-MM-DD
} & ActivityFlags;

export type Blockout = {
  id: string;
  personId: string;
  startDate: string; // YYYY-MM-DD inclusive
  endDate: string; // YYYY-MM-DD inclusive
  createdAt: string;
};

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
  blocked: boolean;
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
  weeklyActive: boolean[]; // last 24 weeks (~6 months), oldest → newest; true if ≥4 active days
};
