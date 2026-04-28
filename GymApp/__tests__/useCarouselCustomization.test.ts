import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCarouselCustomization } from '../src/hooks/useCarouselCustomization';
import type { QuickWorkout } from '../src/types';

const mockWorkouts: QuickWorkout[] = [
  {
    id: 'hiit',
    name: 'HIIT Express',
    icon: '⚡',
    duration: 20,
    color: '#EF4444',
    description: 'Alta intensidade',
    tag: 'Queima Rápida',
    muscleGroups: ['Core', 'Quadríceps'],
    exercises: [
      { name: 'Burpee', sets: 4, reps: '10', rest: '30s' },
      { name: 'Mountain Climber', sets: 4, reps: '30s', rest: '20s', muscleGroups: ['Core'] },
      { name: 'Jump Squat', sets: 3, reps: '15', rest: '30s', muscleGroups: ['Quadríceps'] },
    ],
  },
  {
    id: 'core',
    name: 'Core',
    icon: '🔥',
    duration: 15,
    color: '#EC4899',
    description: 'Abdômen',
    tag: 'Core',
    muscleGroups: ['Core'],
    exercises: [
      { name: 'Prancha', sets: 4, reps: '45s', rest: '0s' },
      { name: 'Abdominal', sets: 4, reps: '20', rest: '0s', muscleGroups: ['Core'] },
    ],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

// ─── Default behaviour ────────────────────────────────────────────────────

describe('useCarouselCustomization — defaults', () => {
  it('returns all indices enabled by default', async () => {
    const { result } = renderHook(() => useCarouselCustomization(mockWorkouts));

    await act(async () => {});

    const enabled = result.current.getEnabledIndices('hiit', 3);
    expect(enabled).toEqual(new Set([0, 1, 2]));
  });

  it('buildCustomWorkout returns full workout when nothing customised', async () => {
    const { result } = renderHook(() => useCarouselCustomization(mockWorkouts));
    await act(async () => {});

    const built = result.current.buildCustomWorkout(mockWorkouts[0]);
    expect(built.exercises).toHaveLength(3);
    expect(built.exercises[0].name).toBe('Burpee');
  });
});

// ─── toggleExercise ────────────────────────────────────────────────────────

describe('useCarouselCustomization — toggleExercise', () => {
  it('disables an exercise after toggle', async () => {
    const { result } = renderHook(() => useCarouselCustomization(mockWorkouts));
    await act(async () => {});

    act(() => {
      result.current.toggleExercise('hiit', 1, 3);
    });

    const enabled = result.current.getEnabledIndices('hiit', 3);
    expect(enabled.has(1)).toBe(false);
    expect(enabled.has(0)).toBe(true);
    expect(enabled.has(2)).toBe(true);
  });

  it('re-enables an exercise after second toggle', async () => {
    const { result } = renderHook(() => useCarouselCustomization(mockWorkouts));
    await act(async () => {});

    act(() => { result.current.toggleExercise('hiit', 1, 3); });
    act(() => { result.current.toggleExercise('hiit', 1, 3); });

    const enabled = result.current.getEnabledIndices('hiit', 3);
    expect(enabled.has(1)).toBe(true);
  });

  it('does not allow disabling the last exercise', async () => {
    const { result } = renderHook(() => useCarouselCustomization(mockWorkouts));
    await act(async () => {});

    // Disable until only one remains
    act(() => { result.current.toggleExercise('core', 0, 2); }); // 1 remains
    act(() => { result.current.toggleExercise('core', 1, 2); }); // attempt to remove last

    const enabled = result.current.getEnabledIndices('core', 2);
    // At least one should remain enabled
    expect(enabled.size).toBeGreaterThanOrEqual(1);
  });

  it('persists selection to AsyncStorage', async () => {
    const { result } = renderHook(() => useCarouselCustomization(mockWorkouts));
    await act(async () => {});

    act(() => { result.current.toggleExercise('hiit', 2, 3); });

    await act(async () => {});
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@gymapp_carousel_selection',
      expect.any(String)
    );
  });
});

// ─── buildCustomWorkout ────────────────────────────────────────────────────

describe('useCarouselCustomization — buildCustomWorkout', () => {
  it('returns only enabled exercises', async () => {
    const { result } = renderHook(() => useCarouselCustomization(mockWorkouts));
    await act(async () => {});

    act(() => { result.current.toggleExercise('hiit', 1, 3); }); // disable Mountain Climber

    const built = result.current.buildCustomWorkout(mockWorkouts[0]);
    expect(built.exercises).toHaveLength(2);
    expect(built.exercises.map(e => e.name)).not.toContain('Mountain Climber');
    expect(built.exercises.map(e => e.name)).toContain('Burpee');
    expect(built.exercises.map(e => e.name)).toContain('Jump Squat');
  });
});

// ─── resetSelection ───────────────────────────────────────────────────────

describe('useCarouselCustomization — resetSelection', () => {
  it('restores all exercises after reset', async () => {
    const { result } = renderHook(() => useCarouselCustomization(mockWorkouts));
    await act(async () => {});

    act(() => { result.current.toggleExercise('hiit', 0, 3); });
    act(() => { result.current.resetSelection('hiit'); });

    const enabled = result.current.getEnabledIndices('hiit', 3);
    expect(enabled).toEqual(new Set([0, 1, 2]));
  });
});

// ─── Persistence ─────────────────────────────────────────────────────────

describe('useCarouselCustomization — persistence', () => {
  it('loads saved selection from AsyncStorage on mount', async () => {
    const savedMap = JSON.stringify({ hiit: [0, 2] }); // index 1 disabled
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(savedMap);

    const { result } = renderHook(() => useCarouselCustomization(mockWorkouts));
    await act(async () => {});

    const enabled = result.current.getEnabledIndices('hiit', 3);
    expect(enabled).toEqual(new Set([0, 2]));
    expect(enabled.has(1)).toBe(false);
  });
});

describe('useCarouselCustomization — muscle group filter', () => {
  it('filters workout by selected muscle group and persists selection', async () => {
    const { result } = renderHook(() => useCarouselCustomization(mockWorkouts));
    await act(async () => {});

    act(() => {
      result.current.setMuscleGroupFilter(mockWorkouts[0], 'Core');
    });

    const enabled = result.current.getEnabledIndices('hiit', 3);
    expect(enabled).toEqual(new Set([1]));
    expect(result.current.getMuscleGroupFilter('hiit')).toBe('Core');
  });
});
