import { CompletedWorkout } from '../types';

export const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Ombro', 'Trapézio', 'Bíceps', 'Tríceps',
  'Quadríceps', 'Posterior', 'Glúteo', 'Panturrilha', 'Abdômen',
];

// Maps exercise names (PT-BR, lowercase key for fuzzy matching) → primary muscles trained
const EXERCISE_MUSCLE_MAP: [RegExp, string[]][] = [
  // Peito
  [/supino/i,           ['Peito', 'Tríceps', 'Ombro']],
  [/crucifixo/i,        ['Peito']],
  [/flexão|push.?up/i, ['Peito', 'Tríceps']],
  [/pull.?over/i,       ['Peito', 'Costas']],

  // Costas
  [/puxada/i,           ['Costas', 'Bíceps']],
  [/remada/i,           ['Costas', 'Bíceps']],
  [/levantamento terra|deadlift/i, ['Costas', 'Posterior', 'Glúteo']],
  [/barra fixa|pull.?up|chin.?up/i, ['Costas', 'Bíceps']],
  [/serrote|row/i,      ['Costas']],

  // Ombro
  [/desenvolvimento|press.*ombro|militar/i, ['Ombro', 'Tríceps']],
  [/elevação lateral/i, ['Ombro']],
  [/elevação frontal/i, ['Ombro']],
  [/arnold/i,           ['Ombro']],
  [/encolhimento|shrug/i, ['Trapézio']],

  // Bíceps
  [/rosca/i,            ['Bíceps']],

  // Tríceps
  [/tríceps|triceps|mergulho|dip/i, ['Tríceps']],
  [/extensão.*tríceps|extensão.*braço/i, ['Tríceps']],

  // Quadríceps / Pernas
  [/agachamento|squat/i, ['Quadríceps', 'Glúteo', 'Posterior']],
  [/leg press/i,         ['Quadríceps', 'Glúteo']],
  [/cadeira extensora|leg extension/i, ['Quadríceps']],
  [/hack squat/i,        ['Quadríceps', 'Glúteo']],
  [/avanço|lunges?/i,    ['Quadríceps', 'Glúteo']],
  [/búlgaro|bulgarian/i, ['Quadríceps', 'Glúteo']],
  [/jump squat|box jump/i, ['Quadríceps', 'Glúteo']],
  [/thruster/i,          ['Quadríceps', 'Ombro']],

  // Posterior / Isquio
  [/cadeira flexora|leg curl|mesa flexora/i, ['Posterior']],
  [/stiff|peso morto romeno|rdl/i,           ['Posterior', 'Glúteo']],

  // Glúteo
  [/hip thrust|elevação pélvica|glúteo/i, ['Glúteo']],
  [/abdução|abdutor/i,                     ['Glúteo']],

  // Panturrilha
  [/gêmeos|panturrilha|calf/i, ['Panturrilha']],

  // Abdômen / Core
  [/prancha|plank/i,         ['Abdômen']],
  [/abdominal|crunch|sit.?up/i, ['Abdômen']],
  [/russian twist/i,         ['Abdômen']],
  [/elevação de perna/i,     ['Abdômen']],
  [/mountain climber/i,      ['Abdômen', 'Ombro']],

  // HIIT / Funcional
  [/burpee/i,          ['Peito', 'Quadríceps', 'Abdômen']],
  [/high knees/i,      ['Quadríceps']],
  [/kettlebell swing/i, ['Glúteo', 'Posterior', 'Costas']],
];

function musclesForExercise(name: string): string[] {
  for (const [pattern, muscles] of EXERCISE_MUSCLE_MAP) {
    if (pattern.test(name)) return muscles;
  }
  return []; // unmapped
}

export interface FatigueScore {
  group: string;
  score: number;           // 0–100
  lastDaysAgo: number | null; // days since last workout that trained this group
  totalSets: number;       // sets in last 7 days
}

export function calculateFatigue(history: CompletedWorkout[]): FatigueScore[] {
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const recent = history.filter(w => now - new Date(w.date).getTime() <= SEVEN_DAYS_MS);

  const setsPerGroup: Record<string, number> = {};
  const lastTrainedMs: Record<string, number> = {};

  for (const workout of recent) {
    const workoutTs = new Date(workout.date).getTime();
    for (const ex of workout.exercises) {
      const muscles = musclesForExercise(ex.name);
      const doneSets = ex.sets.filter(s => s.done).length || ex.targetSets;
      for (const muscle of muscles) {
        // Recency weight: more recent = higher weight (0.14 for 7d ago → 1.0 for today)
        const daysAgo = (now - workoutTs) / (24 * 60 * 60 * 1000);
        const recencyWeight = Math.max(0.1, 1 - daysAgo / 8);
        setsPerGroup[muscle] = (setsPerGroup[muscle] ?? 0) + doneSets * recencyWeight;
        if (!lastTrainedMs[muscle] || workoutTs > lastTrainedMs[muscle]) {
          lastTrainedMs[muscle] = workoutTs;
        }
      }
    }
  }

  // Max plausible weighted sets in 7 days to normalize score: ~30 (5 sets × 6 days)
  const NORMALIZATION = 30;

  return MUSCLE_GROUPS.map((group) => {
    const weighted = setsPerGroup[group] ?? 0;
    const score = Math.min(100, Math.round((weighted / NORMALIZATION) * 100));
    const lastMs = lastTrainedMs[group];
    const lastDaysAgo = lastMs
      ? Math.round((now - lastMs) / (24 * 60 * 60 * 1000))
      : null;
    return { group, score, lastDaysAgo, totalSets: Math.round(weighted) };
  });
}

export function fatigueColor(score: number): string {
  if (score < 34) return '#10B981'; // green — recovered
  if (score < 67) return '#F59E0B'; // yellow — moderate
  return '#EF4444';                  // red — fatigued
}

export function fatigueLabel(score: number): string {
  if (score < 34) return 'Recuperado';
  if (score < 67) return 'Moderado';
  return 'Fatigado';
}

export interface MuscleFatigueEntry {
  group: string;
  fatigue: number;
  lastTrainedDays: number | null;
}

export function computeMuscleFatigue(
  history: CompletedWorkout[],
  now: Date = new Date(),
): MuscleFatigueEntry[] {
  const nowMs = now.getTime();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const recent = history.filter(w => nowMs - new Date(w.date).getTime() <= SEVEN_DAYS_MS);

  const setsPerGroup: Record<string, number> = {};
  const lastTrainedMs: Record<string, number> = {};

  for (const workout of recent) {
    const workoutTs = new Date(workout.date).getTime();
    for (const ex of workout.exercises) {
      const muscles = musclesForExercise(ex.name);
      const doneSets = ex.sets.filter(s => s.done).length || ex.targetSets;
      for (const muscle of muscles) {
        const daysAgo = (nowMs - workoutTs) / (24 * 60 * 60 * 1000);
        const recencyWeight = Math.max(0.1, 1 - daysAgo / 8);
        setsPerGroup[muscle] = (setsPerGroup[muscle] ?? 0) + doneSets * recencyWeight;
        if (!lastTrainedMs[muscle] || workoutTs > lastTrainedMs[muscle]) {
          lastTrainedMs[muscle] = workoutTs;
        }
      }
    }
  }

  const NORMALIZATION = 30;

  return MUSCLE_GROUPS.map((group) => {
    const weighted = setsPerGroup[group] ?? 0;
    const fatigue = Math.min(100, Math.round((weighted / NORMALIZATION) * 100));
    const lastMs = lastTrainedMs[group];
    const lastTrainedDays = lastMs
      ? Math.round((nowMs - lastMs) / (24 * 60 * 60 * 1000))
      : null;
    return { group, fatigue, lastTrainedDays };
  });
}
