import { AnnualPlan, Exercise, WorkoutDay, WorkoutTemplate } from '../types';

/**
 * Build a lookup map from template id → WorkoutTemplate for the given plan.
 * Returns an empty map when the plan has no templates (legacy plans).
 */
export function resolveTemplatesById(plan: AnnualPlan): Map<string, WorkoutTemplate> {
  const map = new Map<string, WorkoutTemplate>();
  if (!plan.templates) return map;
  for (const t of plan.templates) {
    map.set(t.id, t);
  }
  return map;
}

/**
 * Resolve the effective exercise list for a WorkoutDay using the priority chain:
 *   1. day.overrideExercises  (per-occurrence manual override)
 *   2. template exercises      (via day.templateId)
 *   3. day.exercises           (legacy / fallback)
 *
 * Always returns a non-empty array when the day itself has exercises defined.
 */
export function resolveDayExercises(
  day: WorkoutDay,
  templatesById: Map<string, WorkoutTemplate>,
): Exercise[] {
  if (day.overrideExercises && day.overrideExercises.length > 0) {
    return day.overrideExercises;
  }
  if (day.templateId) {
    const tpl = templatesById.get(day.templateId);
    if (tpl && tpl.exercises.length > 0) {
      return tpl.exercises;
    }
  }
  return day.exercises ?? [];
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Format a Date as a local YYYY-MM-DD string without any UTC conversion.
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD string into a local midnight Date.
 * @throws If dateStr is not in YYYY-MM-DD format with valid numeric parts.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length !== 3) throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) throw new Error(`Invalid date values in: ${dateStr}.`);
  return new Date(y, m - 1, d);
}

/**
 * Return today as a YYYY-MM-DD local string.
 */
export function todayLocalString(): string {
  return toLocalDateString(new Date());
}

/**
 * Returns true if instanceDate (YYYY-MM-DD) is on or after today.
 */
export function isOnOrAfterToday(instanceDate: string): boolean {
  return instanceDate >= todayLocalString();
}
