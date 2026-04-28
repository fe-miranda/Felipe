export type PlanDuration = 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual';

export type FitnessGoal =
  | 'lose_weight'
  | 'gain_muscle'
  | 'improve_endurance'
  | 'general_fitness'
  | 'increase_strength';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export type Gender = 'male' | 'female' | 'other';

export interface UserProfile {
  name: string;
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: Gender;
  fitnessLevel: FitnessLevel;
  goal: FitnessGoal;
  daysPerWeek: number;
  workoutDuration: number; // total minutes per session
  cardioMinutes: number;   // cardio portion per session
  injuries?: string;
  planDuration?: PlanDuration;
}

export interface WorkoutTemplate {
  /** Short identifier, e.g. "A", "B", "C" */
  id: string;
  /** Display label, e.g. "Treino A" */
  label: string;
  focus: string;
  exercises: Exercise[];
  notes?: string;
}

export interface WorkoutDay {
  dayOfWeek: string;
  focus: string;
  duration: number; // minutes
  exercises: Exercise[];
  notes?: string;
  /** Points to a WorkoutTemplate id (e.g. "A", "B", "C") */
  templateId?: string;
  /** Per-occurrence exercise override — takes priority over template */
  overrideExercises?: Exercise[];
  /** Absolute calendar date for this occurrence — YYYY-MM-DD (local) */
  instanceDate?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  muscleGroups?: string[];
  notes?: string;
  blockType?: string;
}

export interface WeeklyPlan {
  week: number;
  theme: string;
  days: WorkoutDay[];
  weeklyGoals: string[];
}

export interface MonthlyBlock {
  month: number;
  monthName: string;
  focus: string;
  description: string;
  weeks: WeeklyPlan[];
  progressIndicators: string[];
}

export interface AnnualPlan {
  userId: string;
  createdAt: string;
  userProfile: UserProfile;
  totalMonths: number;
  overallGoal: string;
  monthlyBlocks: MonthlyBlock[];
  nutritionTips: string[];
  recoveryTips: string[];
  /** Workout templates (A/B/C…) shared across the plan */
  templates?: WorkoutTemplate[];
}

// ─── Workout tracking ────────────────────────────────────────────────────────

export interface SetLog {
  load: string;  // kg as string (empty = bodyweight)
  reps: string;
  done: boolean;
}

export interface ExerciseLog {
  name: string;
  targetSets: number;
  targetReps: string;
  rest: string;
  sets: SetLog[];
  blockType?: string;
}

export interface CompletedWorkout {
  id: string;
  date: string;            // ISO string
  dayOfWeek: string;
  focus: string;
  durationSeconds: number;
  exercises: ExerciseLog[];
  monthIndex?: number;
  weekIndex?: number;
  dayIndex?: number;
}

// ─── Quick workouts ──────────────────────────────────────────────────────────

export interface QuickWorkout {
  id: string;
  name: string;
  icon: string;
  duration: number;
  color: string;
  description: string;
  tag: string;
  exercises: Exercise[];
  muscleGroups: string[];
}

// ─── Heart rate ──────────────────────────────────────────────────────────────

export type HeartRateStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'unavailable';

export interface HeartRateSample {
  bpm: number;
  timestamp: string; // ISO string
}

export interface HeartRateState {
  status: HeartRateStatus;
  bpm: number | null;
  deviceName: string | null;
  error: string | null;
  samples: HeartRateSample[];
}

// ─── Carousel customization ──────────────────────────────────────────────────

export interface CarouselSelectionState {
  [workoutId: string]: Set<number>; // set of enabled exercise indices
}

// ─── Tab navigator param list ────────────────────────────────────────────────

export type MainTabParamList = {
  Inicio: undefined;
  WorkoutHistory: undefined;
  Chat: undefined;
  Settings: undefined;
};

// ─── Root stack param list ────────────────────────────────────────────────────
// Chat, WorkoutHistory and Settings live inside MainTabParamList (bottom tabs).
// They are also listed here so TypeScript allows navigation.navigate() calls
// from stack screens; React Navigation resolves them through the nested tab.

export type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  NewPlan: undefined;
  /** Plan review screen shown after generation — user confirms before activating */
  PlanReview: undefined;
  /** Main app shell — renders the bottom tab navigator. */
  Main: undefined;
  MonthDetail: { monthIndex: number };
  WeekDetail: { monthIndex: number; weekIndex: number };
  WorkoutDetail: { monthIndex: number; weekIndex: number; dayIndex: number };
  ActiveWorkout: {
    workout: WorkoutDay;
    context?: { monthIndex: number; weekIndex: number; dayIndex: number };
  };
  MuscleFatigue: undefined;
  PerformanceAnalysis: undefined;
  // Tab screens — resolved at runtime through the nested MainTabNavigator
  WorkoutHistory: undefined;
  Chat: undefined;
  Settings: undefined;
};
