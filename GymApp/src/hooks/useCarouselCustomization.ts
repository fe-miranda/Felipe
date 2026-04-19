/**
 * useCarouselCustomization — persisted selection state for the quick-workout carousel.
 *
 * Each workout id maps to a Set of enabled exercise indices.
 * If no custom selection exists for a workout, ALL exercises are considered enabled
 * (preserving current default behavior).
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuickWorkout } from '../types';

const CAROUSEL_KEY = '@gymapp_carousel_selection';

type SelectionMap = Record<string, number[]>; // serialisable form

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function loadSelectionMap(): Promise<SelectionMap> {
  try {
    const raw = await AsyncStorage.getItem(CAROUSEL_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SelectionMap;
  } catch {
    return {};
  }
}

async function saveSelectionMap(map: SelectionMap): Promise<void> {
  try {
    await AsyncStorage.setItem(CAROUSEL_KEY, JSON.stringify(map));
  } catch {
    // silently ignore
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCarouselCustomization(workouts: QuickWorkout[]) {
  // key → array of enabled exercise indices (undefined means all enabled)
  const [selectionMap, setSelectionMap] = useState<SelectionMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSelectionMap().then(m => {
      setSelectionMap(m);
      setLoaded(true);
    });
  }, []);

  /** Returns the enabled exercise indices for a workout (defaults to all). */
  const getEnabledIndices = useCallback((workoutId: string, totalExercises: number): Set<number> => {
    if (!loaded || selectionMap[workoutId] === undefined) {
      return new Set(Array.from({ length: totalExercises }, (_, i) => i));
    }
    return new Set(selectionMap[workoutId]);
  }, [selectionMap, loaded]);

  /** Toggle a single exercise on/off for a given workout. */
  const toggleExercise = useCallback((workoutId: string, exIdx: number, totalExercises: number): void => {
    setSelectionMap(prev => {
      // Initialise from default (all on) if not yet customised
      const current = prev[workoutId] !== undefined
        ? new Set(prev[workoutId])
        : new Set(Array.from({ length: totalExercises }, (_, i) => i));

      if (current.has(exIdx)) {
        // Don't allow deselecting the last exercise
        if (current.size <= 1) return prev;
        current.delete(exIdx);
      } else {
        current.add(exIdx);
      }

      const next = { ...prev, [workoutId]: Array.from(current).sort((a, b) => a - b) };
      saveSelectionMap(next); // async, fire-and-forget
      return next;
    });
  }, []);

  /** Reset a workout's selection back to all exercises enabled. */
  const resetSelection = useCallback((workoutId: string): void => {
    setSelectionMap(prev => {
      const next = { ...prev };
      delete next[workoutId];
      saveSelectionMap(next);
      return next;
    });
  }, []);

  /** Build a workout with only the enabled exercises. */
  const buildCustomWorkout = useCallback((workout: QuickWorkout): QuickWorkout => {
    const enabled = getEnabledIndices(workout.id, workout.exercises.length);
    const selectedExercises = workout.exercises.filter((_, i) => enabled.has(i));
    return {
      ...workout,
      exercises: selectedExercises.length > 0 ? selectedExercises : workout.exercises,
    };
  }, [getEnabledIndices]);

  return {
    loaded,
    getEnabledIndices,
    toggleExercise,
    resetSelection,
    buildCustomWorkout,
  };
}
