import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnnualPlan, UserProfile, Exercise } from '../types';
import { generateAnnualPlan, generateMonthDetail } from '../services/aiService';

const PLAN_KEY = '@gymapp_plan';
const PROFILE_KEY = '@gymapp_profile';

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

        await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(newPlan));
        setPlan(newPlan);
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
    async (monthIndex: number): Promise<void> => {
      const stored = await AsyncStorage.getItem(PLAN_KEY);
      if (!stored) throw new Error('Plano não encontrado.');

      const currentPlan: AnnualPlan = JSON.parse(stored);
      const monthBlock = currentPlan.monthlyBlocks[monthIndex];
      if (!monthBlock) throw new Error('Mês inválido no plano.');

      const weeks = await generateMonthDetail(monthBlock, currentPlan.userProfile, currentPlan.overallGoal);

      const updatedPlan: AnnualPlan = {
        ...currentPlan,
        monthlyBlocks: currentPlan.monthlyBlocks.map((b, i) =>
          i === monthIndex ? { ...b, weeks } : b
        ),
      };

      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(updatedPlan));
      setPlan(updatedPlan);
    },
    []
  );

  const clearPlan = useCallback(async () => {
    await AsyncStorage.removeItem(PLAN_KEY);
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

  return {
    plan,
    loading,
    progress,
    error,
    generate,
    generateMonth,
    loadStoredPlan,
    loadProfile,
    saveProfile,
    clearPlan,
    updateExercisesInPlan,
  };
}
