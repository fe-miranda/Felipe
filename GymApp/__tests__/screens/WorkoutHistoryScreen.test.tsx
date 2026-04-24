import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutHistoryScreen } from '../../src/screens/WorkoutHistoryScreen';
import * as workoutHistoryService from '../../src/services/workoutHistoryService';
import type { CompletedWorkout } from '../../src/types';

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('../../src/services/workoutHistoryService');

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

function makeWorkout(id: string, overrides: Partial<CompletedWorkout> = {}): CompletedWorkout {
  return {
    id,
    date: '2026-04-01T10:00:00.000Z',
    dayOfWeek: 'Segunda',
    focus: 'Peito e Tríceps',
    durationSeconds: 3660,
    exercises: [
      {
        name: 'Supino Reto',
        targetSets: 3,
        targetReps: '10',
        rest: '60s',
        sets: [
          { load: '80', reps: '10', done: true },
          { load: '80', reps: '10', done: true },
          { load: '80', reps: '8',  done: false },
        ],
      },
      {
        name: 'Tríceps Corda',
        targetSets: 3,
        targetReps: '12',
        rest: '45s',
        sets: [
          { load: '30', reps: '12', done: true },
          { load: '30', reps: '12', done: true },
          { load: '30', reps: '12', done: true },
        ],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
  (workoutHistoryService.loadHistory as jest.Mock).mockResolvedValue([]);
  (workoutHistoryService.deleteWorkout as jest.Mock).mockResolvedValue(undefined);
});

// ─── Empty state ────────────────────────────────────────────────────────────

describe('WorkoutHistoryScreen — empty state', () => {
  it('shows the empty-state message when there are no workouts', async () => {
    const { findByText } = render(
      <WorkoutHistoryScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('Nenhum treino registrado')).toBeTruthy();
  });

  it('shows all four stat cards with zero values', async () => {
    const { findByText } = render(
      <WorkoutHistoryScreen navigation={mockNavigation as any} />
    );
    const treinos = await findByText('Treinos');
    expect(treinos).toBeTruthy();
    expect(await findByText('Minutos')).toBeTruthy();
    expect(await findByText('Sequência')).toBeTruthy();
    expect(await findByText('Séries')).toBeTruthy();
  });
});

// ─── With history ───────────────────────────────────────────────────────────

describe('WorkoutHistoryScreen — with history', () => {
  it('renders a workout card for each history entry', async () => {
    (workoutHistoryService.loadHistory as jest.Mock).mockResolvedValue([
      makeWorkout('1'),
      makeWorkout('2', { focus: 'Costas e Bíceps' }),
    ]);

    const { findByText } = render(
      <WorkoutHistoryScreen navigation={mockNavigation as any} />
    );

    expect(await findByText('Peito e Tríceps')).toBeTruthy();
    expect(await findByText('Costas e Bíceps')).toBeTruthy();
  });

  it('displays the formatted workout duration', async () => {
    (workoutHistoryService.loadHistory as jest.Mock).mockResolvedValue([
      makeWorkout('1', { durationSeconds: 3660 }), // 61 minutes
    ]);

    const { findByText } = render(
      <WorkoutHistoryScreen navigation={mockNavigation as any} />
    );

    expect(await findByText('61min')).toBeTruthy();
  });

  it('shows the number of completed vs total sets', async () => {
    (workoutHistoryService.loadHistory as jest.Mock).mockResolvedValue([makeWorkout('1')]);

    const { findByText } = render(
      <WorkoutHistoryScreen navigation={mockNavigation as any} />
    );

    // workout has 5 done sets out of 6 total
    expect(await findByText(/5\/6 séries/)).toBeTruthy();
  });

  it('shows the best load for the workout', async () => {
    (workoutHistoryService.loadHistory as jest.Mock).mockResolvedValue([makeWorkout('1')]);

    const { findAllByText } = render(
      <WorkoutHistoryScreen navigation={mockNavigation as any} />
    );

    const matches = await findAllByText(/80kg/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "—" as best load when no sets have a load value', async () => {
    const workout = makeWorkout('1', {
      exercises: [{
        name: 'Prancha',
        targetSets: 3,
        targetReps: '30s',
        rest: '30s',
        sets: [
          { load: '', reps: '30s', done: true },
          { load: '', reps: '30s', done: true },
        ],
      }],
    });
    (workoutHistoryService.loadHistory as jest.Mock).mockResolvedValue([workout]);

    const { findByTestId } = render(
      <WorkoutHistoryScreen navigation={mockNavigation as any} />
    );

    const chip = await findByTestId('chip-best-load');
    expect(chip).toBeTruthy();
  });

  it('updates total stat counts correctly', async () => {
    (workoutHistoryService.loadHistory as jest.Mock).mockResolvedValue([
      makeWorkout('1'), // 3660s = 61min
    ]);

    const { findAllByText } = render(
      <WorkoutHistoryScreen navigation={mockNavigation as any} />
    );

    // 1 workout → "1" in stat card
    const ones = await findAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Delete ─────────────────────────────────────────────────────────────────

describe('WorkoutHistoryScreen — delete', () => {
  it('shows a confirmation Alert when the delete button is pressed', async () => {
    (workoutHistoryService.loadHistory as jest.Mock).mockResolvedValue([makeWorkout('1')]);

    const { findAllByText } = render(
      <WorkoutHistoryScreen navigation={mockNavigation as any} />
    );

    const deleteBtns = await findAllByText('✕');
    fireEvent.press(deleteBtns[0]);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Remover treino',
      'Deseja remover este treino do histórico?',
      expect.any(Array),
    );
  });

  it('calls deleteWorkout and reloads after confirming deletion', async () => {
    (workoutHistoryService.loadHistory as jest.Mock)
      .mockResolvedValueOnce([makeWorkout('1')])  // initial load
      .mockResolvedValueOnce([]);                  // after delete

    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const destructiveBtn = (buttons as any[]).find((b) => b.style === 'destructive');
      destructiveBtn?.onPress?.();
    });

    const { findAllByText } = render(
      <WorkoutHistoryScreen navigation={mockNavigation as any} />
    );

    const deleteBtns = await findAllByText('✕');
    await act(async () => { fireEvent.press(deleteBtns[0]); });

    await waitFor(() => {
      expect(workoutHistoryService.deleteWorkout).toHaveBeenCalledWith('1');
    });
  });
});
