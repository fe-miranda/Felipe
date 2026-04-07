import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnnualPlan, UserProfile } from '../types';
import { generateAnnualPlan } from '../services/aiService';

const PLAN_KEY = '@gymapp_plan';
const PROFILE_KEY = '@gymapp_profile';
const APIKEY_KEY = '@gymapp_apikey';

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

  const saveApiKey = useCallback(async (key: string) => {
    await AsyncStorage.setItem(APIKEY_KEY, key);
  }, []);

  const loadApiKey = useCallback(async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(APIKEY_KEY);
    } catch {
      return null;
    }
  }, []);

  const generate = useCallback(
    async (profile: UserProfile, apiKey: string) => {
      setLoading(true);
      setError(null);
      setProgress('');

      try {
        await saveProfile(profile);
        await saveApiKey(apiKey);

        const newPlan = await generateAnnualPlan(profile, apiKey, (chunk) => {
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
    },
    [saveProfile, saveApiKey]
  );

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
    loadApiKey,
    saveApiKey,
    clearPlan,
  };
}
