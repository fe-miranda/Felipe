import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletedWorkout } from '../types';

const HISTORY_KEY = '@gymapp_workout_history';

export async function saveWorkout(workout: CompletedWorkout): Promise<void> {
  const existing = await loadHistory();
  existing.unshift(workout);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
}

export async function loadHistory(): Promise<CompletedWorkout[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CompletedWorkout[];
  } catch {
    return [];
  }
}

export async function deleteWorkout(id: string): Promise<void> {
  const existing = await loadHistory();
  const filtered = existing.filter((w) => w.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}
