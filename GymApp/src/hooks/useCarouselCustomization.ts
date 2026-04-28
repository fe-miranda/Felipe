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

type WorkoutSelection = {
  enabledIndices: number[];
  muscleGroup: string | null;
};
type SelectionMap = Record<string, WorkoutSelection>; // serialisable form

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function loadSelectionMap(): Promise<SelectionMap> {
  try {
    const raw = await AsyncStorage.getItem(CAROUSEL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number[] | WorkoutSelection>;
    const normalized: SelectionMap = {};
    for (const [workoutId, value] of Object.entries(parsed)) {
      // Backward compatibility:
      // before the 2026 muscle-group filter update, storage persisted only number[]
      // (enabled exercise indices). Normalize that legacy format to the new shape.
      if (Array.isArray(value)) {
        normalized[workoutId] = { enabledIndices: value, muscleGroup: null };
      } else if (value && Array.isArray(value.enabledIndices)) {
        normalized[workoutId] = {
          enabledIndices: value.enabledIndices,
          muscleGroup: value.muscleGroup ?? null,
        };
      }
    }
    return normalized;
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
    return new Set(selectionMap[workoutId].enabledIndices);
  }, [selectionMap, loaded]);

  /** Toggle a single exercise on/off for a given workout. */
  const toggleExercise = useCallback((workoutId: string, exIdx: number, totalExercises: number): void => {
    setSelectionMap(prev => {
      // Initialise from default (all on) if not yet customised
      const currentState = prev[workoutId];
      const current = currentState !== undefined
        ? new Set(currentState.enabledIndices)
        : new Set(Array.from({ length: totalExercises }, (_, i) => i));

      if (current.has(exIdx)) {
        // Don't allow deselecting the last exercise
        if (current.size <= 1) return prev;
        current.delete(exIdx);
      } else {
        current.add(exIdx);
      }

      const next = {
        ...prev,
        [workoutId]: {
          enabledIndices: Array.from(current).sort((a, b) => a - b),
          muscleGroup: null,
        },
      };
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

  /** Returns selected muscle group filter for a workout. */
  const getMuscleGroupFilter = useCallback((workoutId: string): string | null => {
    return selectionMap[workoutId]?.muscleGroup ?? null;
  }, [selectionMap]);

  /**
   * Apply muscle-group filter by enabling all matching exercises.
   * Passing null clears the filter and restores all exercises.
   */
  const setMuscleGroupFilter = useCallback((workout: QuickWorkout, muscleGroup: string | null): void => {
    setSelectionMap(prev => {
      if (!muscleGroup) {
        const next = { ...prev };
        delete next[workout.id];
        saveSelectionMap(next);
        return next;
      }

      const enabled = workout.exercises
        .map((ex, idx) => ({ ex, idx }))
        .filter(({ ex }) => (ex.muscleGroups ?? []).includes(muscleGroup))
        .map(({ idx }) => idx);

      // If no match exists, keep all enabled to avoid empty workout states.
      const enabledIndices = enabled.length > 0
        ? enabled
        : Array.from({ length: workout.exercises.length }, (_, i) => i);

      const next = {
        ...prev,
        [workout.id]: { enabledIndices, muscleGroup },
      };
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
    getMuscleGroupFilter,
    setMuscleGroupFilter,
    toggleExercise,
    resetSelection,
    buildCustomWorkout,
  };
}
