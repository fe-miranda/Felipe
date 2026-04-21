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

export interface WorkoutDay {
  dayOfWeek: string;
  focus: string;
  duration: number; // minutes
  exercises: Exercise[];
  notes?: string;
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

export type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  NewPlan: undefined;
  Home: undefined;
  MonthDetail: { monthIndex: number };
  WeekDetail: { monthIndex: number; weekIndex: number };
  WorkoutDetail: { monthIndex: number; weekIndex: number; dayIndex: number };
  ActiveWorkout: {
    workout: WorkoutDay;
    context?: { monthIndex: number; weekIndex: number; dayIndex: number };
  };
  WorkoutHistory: undefined;
  MuscleFatigue: undefined;
  Chat: undefined;
  Settings: undefined;
  PerformanceAnalysis: undefined;
};
