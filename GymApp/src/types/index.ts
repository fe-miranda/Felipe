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
  injuries?: string;
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
  reps: string; // e.g., "8-12" or "30 seconds"
  rest: string; // e.g., "60s"
  notes?: string;
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

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  GeneratePlan: undefined;
  AnnualPlan: undefined;
  MonthDetail: { monthIndex: number };
  WeekDetail: { monthIndex: number; weekIndex: number };
  WorkoutDetail: { monthIndex: number; weekIndex: number; dayIndex: number };
  Chat: undefined;
};
