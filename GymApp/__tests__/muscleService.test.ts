import { computeMuscleFatigue } from '../src/services/muscleService';
import type { CompletedWorkout } from '../src/types';

function makeWorkout(date: string, exName: string, doneSets = 3): CompletedWorkout {
  return {
    id: `${exName}-${date}`,
    date,
    dayOfWeek: 'Segunda',
    focus: 'Teste',
    durationSeconds: 1800,
    exercises: [
      {
        name: exName,
        targetSets: doneSets,
        targetReps: '10',
        rest: '60s',
        sets: Array.from({ length: doneSets }, () => ({ load: '20', reps: '10', done: true })),
      },
    ],
  };
}

describe('computeMuscleFatigue', () => {
  const now = new Date('2026-04-19T12:00:00.000Z');

  it('returns all muscle groups with bounded fatigue values', () => {
    const out = computeMuscleFatigue([], now);
    expect(out.length).toBeGreaterThan(10);
    expect(out.every((g) => g.fatigue >= 0 && g.fatigue <= 100)).toBe(true);
  });

  it('applies higher fatigue for recent workouts', () => {
    const history: CompletedWorkout[] = [
      makeWorkout('2026-04-18T10:00:00.000Z', 'Supino Reto', 4),
      makeWorkout('2026-04-13T10:00:00.000Z', 'Supino Reto', 4),
    ];
    const out = computeMuscleFatigue(history, now);
    const peito = out.find((g) => g.group === 'Peito');
    expect(peito).toBeDefined();
    expect(peito!.fatigue).toBeGreaterThan(0);
    expect(peito!.lastTrainedDays).toBe(1);
  });

  it('ignores workouts outside the 7-day window', () => {
    const history: CompletedWorkout[] = [
      makeWorkout('2026-04-01T10:00:00.000Z', 'Supino Reto', 5),
    ];
    const out = computeMuscleFatigue(history, now);
    const peito = out.find((g) => g.group === 'Peito');
    expect(peito?.fatigue).toBe(0);
    expect(peito?.lastTrainedDays).toBeNull();
  });
});
