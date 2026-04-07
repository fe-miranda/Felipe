import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnnualPlan, UserProfile } from '../types';
import { generateAnnualPlan } from '../services/claudeApi';

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

  const generate = useCallback(async (profile: UserProfile) => {
    setLoading(true);
    setError(null);
    setProgress('');

    try {
      await saveProfile(profile);

      const newPlan = await generateAnnualPlan(profile, (chunk) => {
        setProgress((prev) => prev + chunk);
      });

      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(newPlan));
      setPlan(newPlan);
      return newPlan;
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar o plano. Verifique sua API key.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [saveProfile]);

  const clearPlan = useCallback(async () => {
    await AsyncStorage.removeItem(PLAN_KEY);
    setPlan(null);
  }, []);

  return {
    plan,
    loading,
    progress,
    error,
    generate,
    loadStoredPlan,
    loadProfile,
    saveProfile,
    clearPlan,
  };
}
