import { CompletedWorkout } from '../types';

export const MUSCLE_GROUPS = [
  'Peito',
  'Dorsal',
  'Ombro',
  'Trapézio',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Core',
  'Posterior',
  'Glúteo',
  'Quadríceps',
  'Panturrilha',
  'Adutor/Abdutor',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

export const EXERCISE_MUSCLE_MAP: Record<string, MuscleGroup[]> = {
  'Supino Reto': ['Peito', 'Tríceps'],
  'Remada Curvada': ['Dorsal', 'Bíceps', 'Trapézio'],
  Desenvolvimento: ['Ombro', 'Tríceps'],
  'Puxada Frontal': ['Dorsal', 'Bíceps'],
  'Agachamento Livre': ['Quadríceps', 'Glúteo', 'Adutor/Abdutor'],
  'Leg Press': ['Quadríceps', 'Glúteo'],
  'Cadeira Extensora': ['Quadríceps'],
  'Rosca Direta': ['Bíceps', 'Antebraço'],
  'Tríceps Pulley': ['Tríceps'],
  'Elevação Lateral': ['Ombro', 'Trapézio'],
  'Thruster (barra)': ['Ombro', 'Quadríceps', 'Glúteo'],
  'Pull-up': ['Dorsal', 'Bíceps', 'Antebraço'],
  'Box Jump': ['Quadríceps', 'Panturrilha', 'Glúteo'],
  'Kettlebell Swing': ['Posterior', 'Glúteo', 'Core'],
  Prancha: ['Core'],
  'Abdominal Bici': ['Core'],
  'Russian Twist': ['Core'],
  Burpee: ['Peito', 'Quadríceps', 'Core'],
  'Mountain Climber': ['Core', 'Ombro'],
  'Jump Squat': ['Quadríceps', 'Glúteo'],
  'High Knees': ['Quadríceps', 'Panturrilha'],
};

export type MuscleFatigue = {
  group: MuscleGroup;
  fatigue: number; // 0-100
  lastTrainedDays: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 7;

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function recencyWeight(daysAgo: number): number {
  if (daysAgo <= 1) return 1;
  if (daysAgo === 2) return 0.85;
  if (daysAgo === 3) return 0.7;
  if (daysAgo === 4) return 0.55;
  if (daysAgo === 5) return 0.4;
  if (daysAgo === 6) return 0.25;
  return 0.1;
}

export function computeMuscleFatigue(history: CompletedWorkout[], now = new Date()): MuscleFatigue[] {
  const scores: Record<MuscleGroup, number> = Object.fromEntries(
    MUSCLE_GROUPS.map((g) => [g, 0]),
  ) as Record<MuscleGroup, number>;
  const lastDate: Partial<Record<MuscleGroup, number>> = {};

  const nowTs = now.getTime();
  const lookbackStart = nowTs - LOOKBACK_DAYS * DAY_MS;

  for (const workout of history) {
    const ts = new Date(workout.date).getTime();
    if (Number.isNaN(ts) || ts < lookbackStart || ts > nowTs) continue;

    const daysAgo = Math.floor((nowTs - ts) / DAY_MS);
    const weight = recencyWeight(daysAgo);

    for (const ex of workout.exercises) {
      const groups = EXERCISE_MUSCLE_MAP[ex.name];
      if (!groups || groups.length === 0) continue;
      const doneSets = ex.sets.filter((s) => s.done).length;
      const seriesVolume = doneSets > 0 ? doneSets : ex.targetSets;
      for (const g of groups) {
        scores[g] += seriesVolume * weight;
        if (lastDate[g] === undefined || ts > lastDate[g]!) {
          lastDate[g] = ts;
        }
      }
    }
  }

  const maxScore = Math.max(1, ...Object.values(scores));

  return MUSCLE_GROUPS.map((group) => {
    const ts = lastDate[group];
    const lastTrainedDays = ts !== undefined ? Math.floor((nowTs - ts) / DAY_MS) : null;
    return {
      group,
      fatigue: clamp(Math.round((scores[group] / maxScore) * 100)),
      lastTrainedDays,
    };
  });
}
