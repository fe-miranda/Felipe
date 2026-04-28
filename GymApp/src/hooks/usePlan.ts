import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnnualPlan, UserProfile, Exercise, WorkoutTemplate } from '../types';
import { generateAnnualPlan, generateMonthDetail } from '../services/aiService';
import { toLocalDateString, isOnOrAfterToday } from '../utils/planResolve';

const PLAN_KEY = '@gymapp_plan';
const DRAFT_KEY = '@gymapp_plan_draft';
const PROFILE_KEY = '@gymapp_profile';
const SESSIONS_COUNTER_KEY = '@gymapp_sessions_counter';
const ACTIVE_SESSION_KEY = '@gymapp_active_workout_session';

const DAY_OF_WEEK_ORDER = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

/** Alphabet letters used for template IDs (A, B, C, …) */
const TEMPLATE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Given the plan start date, a month index (0-based) and a week index inside
 * that month, compute the Monday of that week as a Date object.
 * Uses the same 30-days-per-month convention as HomeScreen.
 */
function weekStartDate(planStart: Date, monthIndex: number, weekIndex: number): Date {
  const dayOffset = monthIndex * 30 + weekIndex * 7;
  const d = new Date(planStart);
  d.setDate(d.getDate() + dayOffset);
  return d;
}

/**
 * Return the concrete calendar date for a WorkoutDay inside the plan calendar.
 * dayOfWeek must match one of the DAY_OF_WEEK_ORDER strings.
 */
function computeInstanceDate(
  planStart: Date,
  monthIndex: number,
  weekIndex: number,
  dayOfWeek: string,
): string {
  const monday = weekStartDate(planStart, monthIndex, weekIndex);
  const dowIdx = DAY_OF_WEEK_ORDER.indexOf(dayOfWeek);
  if (dowIdx < 0) return toLocalDateString(monday);
  const d = new Date(monday);
  d.setDate(d.getDate() + dowIdx);
  return toLocalDateString(d);
}

/**
 * Create WorkoutTemplate array from the first week's days (idx 0 → "A", …).
 * Preserves existing templates if already present.
 */
function buildTemplates(
  firstWeekDays: AnnualPlan['monthlyBlocks'][0]['weeks'][0]['days'],
  existing?: WorkoutTemplate[],
): WorkoutTemplate[] {
  if (existing && existing.length > 0) return existing;
  return firstWeekDays.map((day, i) => ({
    id: TEMPLATE_LETTERS[i] ?? String(i),
    label: `Treino ${TEMPLATE_LETTERS[i] ?? i}`,
    focus: day.focus,
    exercises: day.exercises.map((ex) => ({ ...ex })),
    notes: day.notes,
  }));
}

export function usePlan() {
  const [plan, setPlan] = useState<AnnualPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadStoredPlan = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(PLAN_KEY);
      if (stored) {
        setPlan(JSON.parse(stored));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const loadDraft = useCallback(async (): Promise<AnnualPlan | null> => {
    try {
      const stored = await AsyncStorage.getItem(DRAFT_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const saveDraft = useCallback(async (newPlan: AnnualPlan) => {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(newPlan));
  }, []);

  const confirmDraft = useCallback(async (): Promise<void> => {
    const stored = await AsyncStorage.getItem(DRAFT_KEY);
    if (!stored) throw new Error('Nenhum rascunho encontrado.');
    const plan: AnnualPlan = JSON.parse(stored);
    await AsyncStorage.setItem(PLAN_KEY, stored);
    await AsyncStorage.removeItem(DRAFT_KEY);
    // Reset sessions counter using formula: daysPerWeek × 4 weeks × totalMonths
    const totalSessions = (plan.userProfile.daysPerWeek ?? 3) * 4 * (plan.totalMonths ?? 1);
    await AsyncStorage.setItem(SESSIONS_COUNTER_KEY, String(totalSessions));
    setPlan(plan);
  }, []);

  const saveProfile = useCallback(async (profile: UserProfile) => {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, []);

  const loadProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const generate = useCallback(
    async (profile: UserProfile) => {
      setLoading(true);
      setError(null);
      setProgress('');

      try {
        await saveProfile(profile);

        const newPlan = await generateAnnualPlan(profile, (status) => {
          setProgress(status);
        });

        // Save as draft — user must confirm on PlanReviewScreen
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(newPlan));
        return newPlan;
      } catch (err: any) {
        setError(err.message || 'Erro ao gerar o plano.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [saveProfile]
  );

  const generateMonth = useCallback(
    async (monthIndex: number, useDraft = false): Promise<void> => {
      const key = useDraft ? DRAFT_KEY : PLAN_KEY;
      const stored = await AsyncStorage.getItem(key);
      if (!stored) throw new Error('Plano não encontrado.');

      const currentPlan: AnnualPlan = JSON.parse(stored);
      const monthBlock = currentPlan.monthlyBlocks[monthIndex];
      if (!monthBlock) throw new Error('Mês inválido no plano.');

      const weeks = await generateMonthDetail(monthBlock, currentPlan.userProfile, currentPlan.overallGoal);

      // Fill instanceDate for each day
      const planStart = new Date(currentPlan.createdAt);
      const weeksWithDates = weeks.map((week, wi) => ({
        ...week,
        days: week.days.map((day) => ({
          ...day,
          instanceDate: computeInstanceDate(planStart, monthIndex, wi, day.dayOfWeek),
        })),
      }));

      // Build templates from first week's days
      const templates = buildTemplates(weeksWithDates[0]?.days ?? [], currentPlan.templates);

      // Assign templateId to every day by position in the week
      const weeksWithTemplates = weeksWithDates.map((week) => ({
        ...week,
        days: week.days.map((day, di) => ({
          ...day,
          templateId: TEMPLATE_LETTERS[di] ?? String(di),
        })),
      }));

      const updatedPlan: AnnualPlan = {
        ...currentPlan,
        templates,
        monthlyBlocks: currentPlan.monthlyBlocks.map((b, i) =>
          i === monthIndex ? { ...b, weeks: weeksWithTemplates } : b
        ),
      };

      await AsyncStorage.setItem(key, JSON.stringify(updatedPlan));
      if (!useDraft) setPlan(updatedPlan);
    },
    []
  );

  const clearPlan = useCallback(async () => {
    await AsyncStorage.removeItem(PLAN_KEY);
    await AsyncStorage.removeItem(DRAFT_KEY);
    await AsyncStorage.removeItem(SESSIONS_COUNTER_KEY);
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    // NOTE: @gymapp_profile and @gymapp_workout_history are intentionally preserved
    setPlan(null);
  }, []);

  const updateExercisesInPlan = useCallback(
    async (
      monthIndex: number,
      weekIndex: number,
      dayIndex: number,
      newExercises: Exercise[],
      applyToAllSameFocus: boolean,
    ): Promise<void> => {
      const stored = await AsyncStorage.getItem(PLAN_KEY);
      if (!stored) throw new Error('Plano não encontrado.');

      const currentPlan: AnnualPlan = JSON.parse(stored);
      const targetDay = currentPlan.monthlyBlocks[monthIndex]?.weeks[weekIndex]?.days[dayIndex];
      if (!targetDay) throw new Error('Dia não encontrado.');

      const targetFocus = targetDay.focus;

      const updatedPlan: AnnualPlan = {
        ...currentPlan,
        monthlyBlocks: currentPlan.monthlyBlocks.map((block, mi) => ({
          ...block,
          weeks: block.weeks.map((week, wi) => ({
            ...week,
            days: week.days.map((day, di) => {
              if (mi === monthIndex && wi === weekIndex && di === dayIndex) {
                return { ...day, exercises: newExercises };
              }
              if (applyToAllSameFocus && day.focus === targetFocus) {
                return { ...day, exercises: newExercises };
              }
              return day;
            }),
          })),
        })),
      };

      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(updatedPlan));
      setPlan(updatedPlan);
    },
    [],
  );

  /**
   * Update the exercises of a template and — for all future occurrences that
   * reference it — ensure they will use the updated template.
   *
   * Only days with `instanceDate >= today` are affected; past occurrences are
   * never modified.
   *
   * By default (`keepOverrides: true`), per-day `overrideExercises` on future
   * days are kept intact (override still takes priority over the template).
   * Pass `keepOverrides: false` to also clear future overrides so they fall
   * back to the newly updated template exercises.
   */
  const updateTemplateExercisesFromToday = useCallback(
    async (
      templateId: string,
      newExercises: Exercise[],
      opts?: { keepOverrides?: boolean },
    ): Promise<void> => {
      const stored = await AsyncStorage.getItem(PLAN_KEY);
      if (!stored) throw new Error('Plano não encontrado.');

      const currentPlan: AnnualPlan = JSON.parse(stored);
      const keepOverrides = opts?.keepOverrides ?? true;

      // Update the template itself
      const updatedTemplates: WorkoutTemplate[] = (currentPlan.templates ?? []).map((t) =>
        t.id === templateId ? { ...t, exercises: newExercises } : t,
      );

      // For future days using this template: clear overrideExercises if requested
      const updatedPlan: AnnualPlan = {
        ...currentPlan,
        templates: updatedTemplates,
        monthlyBlocks: currentPlan.monthlyBlocks.map((block) => ({
          ...block,
          weeks: block.weeks.map((week) => ({
            ...week,
            days: week.days.map((day) => {
              if (day.templateId !== templateId) return day;
              const isFuture = day.instanceDate ? isOnOrAfterToday(day.instanceDate) : false;
              if (!isFuture) return day;
              if (keepOverrides) return day; // template updated; override stays
              return { ...day, overrideExercises: undefined };
            }),
          })),
        })),
      };

      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(updatedPlan));
      setPlan(updatedPlan);
    },
    [],
  );

  /**
   * Set per-day override exercises for a single occurrence.
   */
  const setDayOverrideExercises = useCallback(
    async (
      monthIndex: number,
      weekIndex: number,
      dayIndex: number,
      exercises: Exercise[],
    ): Promise<void> => {
      const stored = await AsyncStorage.getItem(PLAN_KEY);
      if (!stored) throw new Error('Plano não encontrado.');

      const currentPlan: AnnualPlan = JSON.parse(stored);

      const updatedPlan: AnnualPlan = {
        ...currentPlan,
        monthlyBlocks: currentPlan.monthlyBlocks.map((block, mi) => ({
          ...block,
          weeks: block.weeks.map((week, wi) => ({
            ...week,
            days: week.days.map((day, di) => {
              if (mi === monthIndex && wi === weekIndex && di === dayIndex) {
                return { ...day, overrideExercises: exercises };
              }
              return day;
            }),
          })),
        })),
      };

      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(updatedPlan));
      setPlan(updatedPlan);
    },
    [],
  );

  return {
    plan,
    loading,
    progress,
    error,
    generate,
    generateMonth,
    loadStoredPlan,
    loadDraft,
    saveDraft,
    confirmDraft,
    loadProfile,
    saveProfile,
    clearPlan,
    updateExercisesInPlan,
    updateTemplateExercisesFromToday,
    setDayOverrideExercises,
  };
}
