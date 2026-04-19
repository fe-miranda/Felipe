import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveWorkout, loadHistory, deleteWorkout } from '../src/services/workoutHistoryService';
import type { CompletedWorkout } from '../src/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWorkout(id: string, overrides: Partial<CompletedWorkout> = {}): CompletedWorkout {
  return {
    id,
    date: `2026-01-${id.padStart(2, '0')}T10:00:00.000Z`,
    dayOfWeek: 'Segunda',
    focus: 'Peito',
    durationSeconds: 3600,
    exercises: [
      {
        name: 'Supino Reto',
        targetSets: 3,
        targetReps: '10',
        rest: '60s',
        sets: [
          { load: '60', reps: '10', done: true },
          { load: '60', reps: '10', done: true },
          { load: '60', reps: '10', done: false },
        ],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  (AsyncStorage.clear as jest.Mock).mockClear();
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  // Reset to empty storage between tests
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
});

// ─── loadHistory ─────────────────────────────────────────────────────────────

describe('loadHistory', () => {
  it('returns an empty array when storage is empty', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const history = await loadHistory();
    expect(history).toEqual([]);
  });

  it('returns parsed workouts from storage', async () => {
    const workouts = [makeWorkout('1'), makeWorkout('2')];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(workouts));
    const history = await loadHistory();
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('1');
    expect(history[1].id).toBe('2');
  });

  it('returns an empty array when storage contains malformed JSON', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json{{{');
    const history = await loadHistory();
    expect(history).toEqual([]);
  });

  it('returns an empty array when AsyncStorage throws', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage error'));
    const history = await loadHistory();
    expect(history).toEqual([]);
  });
});

// ─── saveWorkout ─────────────────────────────────────────────────────────────

describe('saveWorkout', () => {
  it('saves a workout to an empty history', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const workout = makeWorkout('1');
    await saveWorkout(workout);

    const [, serialized] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
    const saved = JSON.parse(serialized) as CompletedWorkout[];
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('1');
  });

  it('prepends new workout at the front (most recent first)', async () => {
    const existing = [makeWorkout('1')];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

    await saveWorkout(makeWorkout('2'));

    const [, serialized] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
    const saved = JSON.parse(serialized) as CompletedWorkout[];
    expect(saved).toHaveLength(2);
    expect(saved[0].id).toBe('2'); // newest first
    expect(saved[1].id).toBe('1');
  });

  it('uses the correct AsyncStorage key', async () => {
    await saveWorkout(makeWorkout('1'));
    expect((AsyncStorage.setItem as jest.Mock).mock.calls[0][0]).toBe('@gymapp_workout_history');
  });
});

// ─── deleteWorkout ───────────────────────────────────────────────────────────

describe('deleteWorkout', () => {
  it('removes the workout with the given id', async () => {
    const existing = [makeWorkout('1'), makeWorkout('2'), makeWorkout('3')];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

    await deleteWorkout('2');

    const [, serialized] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
    const saved = JSON.parse(serialized) as CompletedWorkout[];
    expect(saved).toHaveLength(2);
    expect(saved.find((w) => w.id === '2')).toBeUndefined();
    expect(saved[0].id).toBe('1');
    expect(saved[1].id).toBe('3');
  });

  it('does nothing when the id does not exist', async () => {
    const existing = [makeWorkout('1')];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

    await deleteWorkout('999');

    const [, serialized] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
    const saved = JSON.parse(serialized) as CompletedWorkout[];
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('1');
  });

  it('produces an empty list when deleting the only workout', async () => {
    const existing = [makeWorkout('1')];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

    await deleteWorkout('1');

    const [, serialized] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
    expect(JSON.parse(serialized)).toEqual([]);
  });
});
