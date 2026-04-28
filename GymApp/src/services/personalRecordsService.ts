import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletedWorkout } from '../types';

const PR_KEY = '@gymapp_personal_records';

export interface PersonalRecord {
  exerciseName: string;
  maxLoad: number;
  maxReps: number;
  maxLoadReps: number;
  date: string;
}

export interface PersonalRecordUpdate {
  exerciseName: string;
  previous: PersonalRecord | null;
  current: PersonalRecord;
}

type RecordsMap = Record<string, PersonalRecord>;

function keyFor(name: string): string {
  return name.trim().toLowerCase();
}

async function loadRecordsMap(): Promise<RecordsMap> {
  try {
    const raw = await AsyncStorage.getItem(PR_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveRecordsMap(map: RecordsMap): Promise<void> {
  await AsyncStorage.setItem(PR_KEY, JSON.stringify(map));
}

export async function loadPersonalRecords(): Promise<PersonalRecord[]> {
  const map = await loadRecordsMap();
  return Object.values(map).sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'pt-BR'));
}

export async function analyzeWorkoutForPersonalRecords(workout: CompletedWorkout): Promise<PersonalRecordUpdate[]> {
  const map = await loadRecordsMap();
  const updates: PersonalRecordUpdate[] = [];

  for (const ex of workout.exercises) {
    let maxLoad = 0;
    let maxReps = 0;
    let maxLoadReps = 0;
    for (const set of ex.sets) {
      if (!set.done) continue;
      const load = parseFloat(set.load);
      const reps = parseFloat(set.reps);
      const safeLoad = Number.isFinite(load) ? Math.max(0, load) : 0;
      const safeReps = Number.isFinite(reps) ? Math.max(0, reps) : 0;
      maxLoad = Math.max(maxLoad, safeLoad);
      maxReps = Math.max(maxReps, safeReps);
      maxLoadReps = Math.max(maxLoadReps, safeLoad * safeReps);
    }
    if (maxLoad === 0 && maxReps === 0 && maxLoadReps === 0) continue;

    const recordKey = keyFor(ex.name);
    const previous = map[recordKey] ?? null;
    const improved = !previous
      || maxLoad > previous.maxLoad
      || maxReps > previous.maxReps
      || maxLoadReps > previous.maxLoadReps;
    if (!improved) continue;

    const current: PersonalRecord = {
      exerciseName: ex.name,
      maxLoad: Math.max(previous?.maxLoad ?? 0, maxLoad),
      maxReps: Math.max(previous?.maxReps ?? 0, maxReps),
      maxLoadReps: Math.max(previous?.maxLoadReps ?? 0, maxLoadReps),
      date: workout.date,
    };
    map[recordKey] = current;
    updates.push({ exerciseName: ex.name, previous, current });
  }

  if (updates.length > 0) {
    await saveRecordsMap(map);
  }
  return updates;
}
