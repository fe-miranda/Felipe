import { Share } from 'react-native';
import {
  shareWorkoutCard,
  shareWeeklyCard,
  buildWeeklyCardData,
  WeeklyCardData,
} from '../src/services/shareService';
import type { CompletedWorkout } from '../src/types';

// The moduleNameMapper in package.json maps expo-sharing → __mocks__/expo-sharing.js
// and expo-print → __mocks__/expo-print.js, so no explicit jest.mock needed.

jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });

const mockWorkout: CompletedWorkout = {
  id: '1234',
  date: '2026-04-19T10:00:00.000Z',
  dayOfWeek: 'Sábado',
  focus: 'Peito e Tríceps',
  durationSeconds: 3600,
  exercises: [
    {
      name: 'Supino Reto',
      targetSets: 4,
      targetReps: '10',
      rest: '60s',
      sets: [
        { load: '80', reps: '10', done: true },
        { load: '80', reps: '10', done: true },
        { load: '80', reps: '10', done: false },
        { load: '80', reps: '10', done: false },
      ],
    },
    {
      name: 'Tríceps Pulley',
      targetSets: 3,
      targetReps: '12',
      rest: '45s',
      sets: [
        { load: '30', reps: '12', done: true },
        { load: '30', reps: '12', done: false },
        { load: '30', reps: '12', done: false },
      ],
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply Share.share mock after clearAllMocks
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  // Ensure default mock implementations are set
  const sharing = require('expo-sharing');
  sharing.isAvailableAsync.mockResolvedValue(true);
  sharing.shareAsync.mockResolvedValue(undefined);
  const print = require('expo-print');
  print.printToFileAsync.mockResolvedValue({ uri: '/tmp/test.pdf' });
});

// ─── buildWeeklyCardData ──────────────────────────────────────────────────

describe('buildWeeklyCardData', () => {
  it('builds card with correct totals', () => {
    const workouts: CompletedWorkout[] = [
      { ...mockWorkout, id: '1', durationSeconds: 3600 },
      { ...mockWorkout, id: '2', durationSeconds: 1800 },
    ];
    const card = buildWeeklyCardData(workouts);
    expect(card.totalWorkouts).toBe(2);
    expect(card.totalMinutes).toBe(90);
  });

  it('identifies the most common exercise as top exercise', () => {
    const workouts: CompletedWorkout[] = [
      { ...mockWorkout, id: '1' },
      { ...mockWorkout, id: '2' },
    ];
    const card = buildWeeklyCardData(workouts);
    expect(typeof card.topExercise).toBe('string');
  });

  it('handles empty workouts array', () => {
    const card = buildWeeklyCardData([]);
    expect(card.totalWorkouts).toBe(0);
    expect(card.totalMinutes).toBe(0);
    expect(card.topExercise).toBeUndefined();
  });

  it('includes avgBpm when provided', () => {
    const card = buildWeeklyCardData([mockWorkout], 145);
    expect(card.avgBpm).toBe(145);
  });
});

// ─── shareWorkoutCard ─────────────────────────────────────────────────────

describe('shareWorkoutCard', () => {
  it('calls expo-print and expo-sharing with workout card HTML', async () => {
    const print = require('expo-print');
    const sharing = require('expo-sharing');

    await shareWorkoutCard({ workout: mockWorkout });

    expect(print.printToFileAsync).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining('Peito e Tríceps') })
    );
    expect(sharing.shareAsync).toHaveBeenCalledWith(
      '/tmp/test.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' })
    );
  });

  it('falls back to Share.share when expo-sharing is not available', async () => {
    const sharing = require('expo-sharing');
    sharing.isAvailableAsync.mockResolvedValueOnce(false);

    await shareWorkoutCard({ workout: mockWorkout });

    expect(Share.share).toHaveBeenCalled();
  });

  it('falls back to Share.share when shareAsync throws', async () => {
    const sharing = require('expo-sharing');
    sharing.shareAsync.mockRejectedValueOnce(new Error('Not available'));

    await shareWorkoutCard({ workout: mockWorkout });

    expect(Share.share).toHaveBeenCalled();
  });

  it('includes heart rate average in the HTML when samples provided', async () => {
    const print = require('expo-print');

    await shareWorkoutCard({
      workout: mockWorkout,
      heartRateSamples: [
        { bpm: 140, timestamp: '2026-04-19T10:00:00.000Z' },
        { bpm: 160, timestamp: '2026-04-19T10:00:03.000Z' },
      ],
    });

    const callArg = print.printToFileAsync.mock.calls[0][0];
    expect(callArg.html).toContain('150'); // avg of 140+160
  });
});

// ─── shareWeeklyCard ──────────────────────────────────────────────────────

describe('shareWeeklyCard', () => {
  it('calls expo-print with RESUMO SEMANAL HTML', async () => {
    const print = require('expo-print');

    const cardData: WeeklyCardData = {
      weekLabel: 'Semana 16 · 2026',
      totalWorkouts: 4,
      totalMinutes: 240,
      topExercise: 'Supino Reto',
      avgBpm: null,
    };

    await shareWeeklyCard(cardData);

    expect(print.printToFileAsync).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining('RESUMO SEMANAL') })
    );
  });

  it('includes avgBpm in HTML when provided', async () => {
    const print = require('expo-print');

    const cardData: WeeklyCardData = {
      weekLabel: 'Semana 16 · 2026',
      totalWorkouts: 3,
      totalMinutes: 180,
      avgBpm: 145,
    };

    await shareWeeklyCard(cardData);

    const callArg = print.printToFileAsync.mock.calls[0][0];
    expect(callArg.html).toContain('145');
  });
});
